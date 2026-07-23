import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role to bypass RLS (same pattern as game-ai route)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// POST /api/submit-answer
// Replaces the Server Action to avoid Next.js 16 serialization issues
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roundId,
      playerId,
      roomId,
      selectedOption,
      selectedText,
      timeTakenMs,
      screenSwitches,
    } = body;

    console.log('[submit-answer] request:', { roundId, playerId, roomId, selectedOption, selectedText: selectedText?.substring(0, 50), timeTakenMs, screenSwitches });

    if (!roundId || !playerId || !roomId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('[submit-answer] Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return NextResponse.json({ error: '服务器配置错误：缺少Supabase环境变量' }, { status: 500 });
    }

    const supabase = getAdminClient();

    // 获取题目信息 + 抢答状态
    const { data: round, error: roundErr } = await supabase
      .from('game_rounds')
      .select('*, question:game_questions(*)')
      .eq('id', roundId)
      .single();

    if (roundErr || !round) {
      console.error('[submit-answer] round fetch error:', roundErr?.message, roundErr?.code);
      return NextResponse.json({ error: '回合不存在' }, { status: 404 });
    }

    console.log('[submit-answer] round found:', { roundId: round.id, status: round.status, buzzedIn: round.buzzed_in_player_id, questionId: round.question_id });

    // 抢答锁定检查
    if (round.buzzed_in_player_id && round.buzzed_in_player_id !== playerId) {
      return NextResponse.json({ error: '本轮已被其他玩家抢答，请等待下一题' }, { status: 409 });
    }

    const question = round.question;
    if (!question) {
      console.error('[submit-answer] question is null for round:', roundId);
      return NextResponse.json({ error: '题目数据缺失' }, { status: 500 });
    }

    let isCorrect: boolean;

    // Only use index-based matching when BOTH correct_index AND options exist
    const hasOptions = question.options && question.options.length > 0;
    if (question.correct_index !== null && question.correct_index !== undefined && hasOptions) {
      isCorrect = selectedOption === Number(question.correct_index);
    } else {
      isCorrect = await aiJudgeAnswer(
        question.correct_answer,
        selectedText || '',
        question.question_text
      );
    }

    console.log('[submit-answer] judged:', { isCorrect, hasOptions, correctIndex: question.correct_index, selectedOption });

    const hasYellowCard = (screenSwitches || 0) >= 2;
    const pointsEarned = isCorrect ? 100 : 0;

    // Safety cap: PostgreSQL integer max is ~2.1B, cap at 999999ms (~16 min)
    const safeTimeMs = (timeTakenMs && timeTakenMs > 0 && timeTakenMs < 1000000) ? timeTakenMs : 0;

    const insertPayload = {
      round_id: roundId,
      player_id: playerId,
      room_id: roomId,
      selected_option: selectedOption ?? -1,
      selected_text: selectedText || '',
      is_correct: isCorrect,
      time_taken_ms: safeTimeMs,
      points_earned: pointsEarned,
      screen_switches: screenSwitches || 0,
      has_yellow_card: hasYellowCard,
    };

    const { data, error } = await supabase
      .from('game_answers')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[submit-answer] INSERT error:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      if (error.code === '23505') {
        return NextResponse.json({ error: '你已经回答过了' }, { status: 409 });
      }
      return NextResponse.json({ error: `提交答案失败: ${error.message}`, code: error.code }, { status: 500 });
    }

    console.log('[submit-answer] answer inserted:', data?.id);

    // 记录反作弊日志（不阻塞主流程）
    try {
      if ((screenSwitches || 0) > 0) {
        await supabase.from('anti_cheat_logs').insert({
          room_id: roomId,
          round_id: roundId,
          player_id: playerId,
          event_type: 'screen_switch',
          details: { count: screenSwitches },
        });
      }
      if (hasYellowCard) {
        await supabase.from('anti_cheat_logs').insert({
          room_id: roomId,
          round_id: roundId,
          player_id: playerId,
          event_type: 'yellow_card',
          details: { screen_switches: screenSwitches },
        });
      }
    } catch (logErr) {
      console.warn('[submit-answer] anti-cheat log insert failed (non-fatal):', logErr);
    }

    // 更新玩家积分和统计（原子递增）
    try {
      const { data: currentPlayer } = await supabase
        .from('game_players')
        .select('streak')
        .eq('id', playerId)
        .single();

      const newStreak = isCorrect ? ((currentPlayer?.streak || 0) + 1) : 0;
      await supabase.rpc('update_player_score_atomic', {
        p_player_id: playerId,
        p_score_delta: pointsEarned,
        p_correct_delta: isCorrect ? 1 : 0,
        p_wrong_delta: isCorrect ? 0 : 1,
        p_new_streak: newStreak,
      });
    } catch (scoreErr) {
      console.warn('[submit-answer] score update failed (non-fatal):', scoreErr);
    }

    return NextResponse.json({ answer: data });
  } catch (err) {
    console.error('[submit-answer] UNCAUGHT error:', err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack : '');
    const msg = err instanceof Error ? err.message : '提交答案时发生未知错误';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// AI 辅助判题（主观题）
// ============================================================

async function aiJudgeAnswer(
  correctAnswer: string,
  playerAnswer: string,
  questionText: string
): Promise<boolean> {
  const fallbackMatch = (): boolean => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[\s《》""''、，。,.!?！？：:;；\-\(\)（）\[\]【】·]/g, '');
    const player = normalize(playerAnswer);

    const ansBody = correctAnswer.replace(/^[A-D][.．、\s]+/i, '');
    const bracketMatches = [...ansBody.matchAll(/《([^》]+)》/g)].map(m => normalize(m[1]));
    const slashKeywords = ansBody.split(/[\/|]/).map(k => normalize(k.replace(/[《》]/g, ''))).filter(Boolean);
    const letterMatch = correctAnswer.match(/^([A-D])/i);
    const letterKeywords = letterMatch ? [letterMatch[1].toLowerCase()] : [];
    const allKeywords = [...new Set([...bracketMatches, ...slashKeywords, ...letterKeywords])].filter(Boolean);
    const effectiveKeywords = allKeywords.length > 0 ? allKeywords : [normalize(ansBody)];

    return effectiveKeywords.some(k => {
      if (k.length === 1 && /^[a-d]$/.test(k)) return player === k;
      return k.length >= 2 && player.includes(k);
    });
  };

  const llmKey = process.env.LLM_API_KEY;
  const llmBaseRaw = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
  const llmModel = process.env.LLM_MODEL || 'deepseek-chat';

  if (!llmKey) {
    return fallbackMatch();
  }

  const llmBase = llmBaseRaw.replace(/\/+v1\/?$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${llmBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          {
            role: 'system',
            content: `你是一个游戏答题裁判。你的任务是判断玩家的答案是否正确。
规则：
1. 只要玩家答案语义上等价于正确答案即可判对，不需要完全一致
2. 大小写、标点符号、书名号的差异不影响判定
3. 如果正确答案有多个（用/或|分隔），答出其中任一个即正确
4. 如果题目要求多个答案（如"说出三部作品"），玩家至少答对要求的数量才算对
5. 允许合理的别名、简称（如"周星驰"="星爷"，"Taylor Swift"="霉霉"）
6. 只回答 "CORRECT" 或 "WRONG"，不要解释`
          },
          {
            role: 'user',
            content: `题目：${questionText}\n正确答案：${correctAnswer}\n玩家答案：${playerAnswer}`
          }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return fallbackMatch();
    }

    const data = await response.json();
    const reply = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
    return reply.includes('CORRECT');
  } catch {
    clearTimeout(timeout);
    return fallbackMatch();
  }
}
