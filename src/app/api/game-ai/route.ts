import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, room_id, player_id, mode = 'player' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '缺少消息' }, { status: 400 });
    }

    const context = await buildGameContext(room_id, player_id, mode);
    const systemPrompt = mode === 'admin'
      ? getAdminSystemPrompt(context)
      : getPlayerSystemPrompt(context);

    const llmKey = process.env.LLM_API_KEY;
    const llmBaseRaw = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
    const llmModel = process.env.LLM_MODEL || 'deepseek-chat';

    if (!llmKey) {
      return NextResponse.json({
        reply: generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode)
      });
    }

    const llmBase = llmBaseRaw.replace(/\/+v1\/?$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10),
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn('LLM API error:', response.status);
        return NextResponse.json({
          reply: generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode)
        });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答。';
      return NextResponse.json({ reply });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.warn('LLM fetch failed:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
      return NextResponse.json({
        reply: generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode)
      });
    }
  } catch (error) {
    console.error('Game AI error:', error);
    return NextResponse.json({ reply: 'AI助手暂时离线，请稍后再试。' }, { status: 200 });
  }
}

// ============================================================
// 构建游戏上下文
// ============================================================

async function buildGameContext(roomId: string, playerId: string, mode: string) {
  const supabase = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: Record<string, any> = { mode };

  if (!roomId) return ctx;

  const { data: room } = await supabase
    .from('game_rooms').select('*').eq('id', roomId).single();
  ctx.room = room;

  const { data: players } = await supabase
    .from('game_players').select('*').eq('room_id', roomId).order('score', { ascending: false });
  ctx.players = players || [];
  ctx.total_players = players?.length || 0;

  const groupA = players?.filter(p => p.group_label === 'A') || [];
  const groupB = players?.filter(p => p.group_label === 'B') || [];
  ctx.group_a = { count: groupA.length, total_score: groupA.reduce((s, p) => s + p.score, 0), players: groupA };
  ctx.group_b = { count: groupB.length, total_score: groupB.reduce((s, p) => s + p.score, 0), players: groupB };

  // 全局排名
  const allSorted = [...(players || [])].sort((a, b) => b.score - a.score);
  ctx.top5 = allSorted.slice(0, 5).map((p, i) => `${i + 1}. ${p.nickname}(${p.group_label}组) ${p.score}分`);

  if (room?.current_round > 0) {
    const { data: round } = await supabase
      .from('game_rounds').select('*, question:game_questions(*)')
      .eq('room_id', roomId).eq('round_number', room.current_round).single();
    ctx.current_round = round;

    if (round) {
      const { data: answers } = await supabase
        .from('game_answers').select('*, player:game_players(nickname, group_label)')
        .eq('round_id', round.id);
      ctx.round_answers = answers || [];
      ctx.answered_count = answers?.length || 0;

      // 本题统计
      const correct = (answers || []).filter(a => a.is_correct).length;
      ctx.round_correct = correct;
      ctx.round_accuracy = ctx.answered_count > 0 ? Math.round(correct / ctx.answered_count * 100) : 0;
    }
  }

  // 历史答题统计（admin用）
  if (mode === 'admin' && players && players.length > 0) {
    const totalCorrect = players.reduce((s, p) => s + p.correct_count, 0);
    const totalWrong = players.reduce((s, p) => s + p.wrong_count, 0);
    const totalAnswered = totalCorrect + totalWrong;
    ctx.overall_accuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;
    ctx.total_correct = totalCorrect;
    ctx.total_wrong = totalWrong;
  }

  if (playerId) {
    const player = players?.find(p => p.id === playerId);
    ctx.my_player = player;
    if (player) {
      const myGroup = players?.filter(p => p.group_label === player.group_label) || [];
      const sorted = [...myGroup].sort((a, b) => b.score - a.score);
      ctx.my_rank = sorted.findIndex(p => p.id === playerId) + 1;
      ctx.my_group_size = myGroup.length;

      // 全局排名
      ctx.my_global_rank = allSorted.findIndex(p => p.id === playerId) + 1;

      // 个人统计
      const myTotal = player.correct_count + player.wrong_count;
      ctx.my_accuracy = myTotal > 0 ? Math.round(player.correct_count / myTotal * 100) : 0;
    }
  }

  return ctx;
}

// ============================================================
// 系统提示词
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPlayerSystemPrompt(ctx: Record<string, any>): string {
  const room = ctx.room;
  const my = ctx.my_player;
  return `你是"脑力派对"游戏的AI助手"派对小Q"，活泼、有趣、 knowledgeable。

当前状态：
- 房间: ${room?.name || '脑力派对'}，状态: ${room?.status === 'waiting' ? '等待中' : room?.status === 'playing' ? '进行中' : room?.status === 'finished' ? '已结束' : '准备中'}
- 当前第${room?.current_round || 0}题
${my ? `- 玩家: ${my.nickname}，${my.group_label}组，${my.score}分，答对${my.correct_count}题，答错${my.wrong_count}题，连对${my.streak}题，正确率${ctx.my_accuracy || 0}%` : ''}
${ctx.my_rank ? `- 组内排名: 第${ctx.my_rank}名/${ctx.my_group_size}人，全局第${ctx.my_global_rank}名/${ctx.total_players}人` : ''}
- A组${ctx.group_a?.count || 0}人${ctx.group_a?.total_score || 0}分 vs B组${ctx.group_b?.count || 0}人${ctx.group_b?.total_score || 0}分

规则：
1. 每题100分，答错不扣分
2. 连续答对3题以上有激励消息
3. 累计答错2次提示表演节目，3次提示自罚一杯
4. 切屏超过2次黄牌警告，影响排名
5. 排名规则: 正确率 > 用时 > 切屏次数 > 总分

回复要求：简短(2-3句)、活泼、不用emoji、绝不透露答案、可适度开玩笑。`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAdminSystemPrompt(ctx: Record<string, any>): string {
  const room = ctx.room;
  return `你是"脑力派对"的管理助手"管理小Q"，专业、简洁、数据驱动。

当前状态：
- 第${room?.current_round || 0}题，${ctx.answered_count || 0}/${ctx.total_players || 0}人已答
- A组${ctx.group_a?.count || 0}人 ${ctx.group_a?.total_score || 0}分 | B组${ctx.group_b?.count || 0}人 ${ctx.group_b?.total_score || 0}分
- 本题正确率: ${ctx.round_accuracy || 0}% (${ctx.round_correct || 0}/${ctx.answered_count || 0})
- 全局正确率: ${ctx.overall_accuracy || 0}% (${ctx.total_correct || 0}对/${ctx.total_wrong || 0}错)
- Top5: ${(ctx.top5 || []).join(', ')}

功能：实时数据分析、节奏建议、异常报告。回复简洁专业，2-3句以内。`;
}

// ============================================================
// 智能降级回复（无LLM时使用实际游戏数据）
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateFallbackReply(message: string, ctx: Record<string, any>, mode: string): string {
  const msg = message.toLowerCase();
  const my = ctx.my_player;
  const room = ctx.room;

  // ---- 玩家模式 ----
  if (mode === 'player') {
    // 排名/名次
    if (msg.includes('排名') || msg.includes('名次') || msg.includes('第几') || msg.includes('排第')) {
      if (ctx.my_rank) {
        const diff = ctx.my_rank <= 3 ? '，名列前茅！' : ctx.my_rank <= ctx.my_group_size / 2 ? '，还不错，继续冲！' : '，加油，还有机会翻盘！';
        return `你在${my?.group_label}组排第${ctx.my_rank}名（共${ctx.my_group_size}人），全局第${ctx.my_global_rank}名（共${ctx.total_players}人）${diff}`;
      }
      return '还没有答题记录，开始答题后就能看到排名了。';
    }

    // 分数/积分
    if (msg.includes('分') || msg.includes('积分') || msg.includes('多少分')) {
      if (my) {
        const acc = ctx.my_accuracy || 0;
        return `你当前${my.score}分，答对${my.correct_count}题，答错${my.wrong_count}题，正确率${acc}%。每答对一题得100分。`;
      }
      return '还没有答题记录。';
    }

    // 规则
    if (msg.includes('规则') || msg.includes('怎么玩') || msg.includes('介绍')) {
      return '规则很简单：主持人播放题目后抢答，答对得100分。排名看正确率，再看用时。切屏会被记录，超过2次黄牌。答错2次要表演节目，3次自罚一杯。';
    }

    // 提示
    if (msg.includes('提示') || msg.includes('hint') || msg.includes('帮我') || msg.includes('答案')) {
      const streak = my?.streak || 0;
      if (streak >= 3) return `你已经连对${streak}题了，手感火热！继续保持，答案就在你的直觉里。`;
      if (my?.wrong_count >= 2) return `已经错了${my.wrong_count}次，别急，深呼吸，下一题稳着来。相信自己！`;
      return '我没法给答案哦，但可以告诉你：仔细听旋律特征，回忆关键信息。相信自己的第一直觉！';
    }

    // 分组/A组B组
    if (msg.includes('组') || msg.includes('a组') || msg.includes('b组') || msg.includes('分组')) {
      const a = ctx.group_a, b = ctx.group_b;
      const lead = a.total_score > b.total_score ? `A组领先${a.total_score - b.total_score}分` : b.total_score > a.total_score ? `B组领先${b.total_score - a.total_score}分` : '两组平分';
      return `A组${a.count}人${a.total_score}分，B组${b.count}人${b.total_score}分，${lead}。你在${my?.group_label}组。`;
    }

    // 正确率
    if (msg.includes('正确率') || msg.includes('准确率') || msg.includes('对了多少')) {
      if (my) {
        return `你的正确率${ctx.my_accuracy || 0}%，答对${my.correct_count}题，答错${my.wrong_count}题。`;
      }
      return '还没有答题数据。';
    }

    // 连对/连击
    if (msg.includes('连对') || msg.includes('连击') || msg.includes('streak')) {
      const s = my?.streak || 0;
      const max = my?.max_streak || 0;
      return s > 0 ? `当前连对${s}题，历史最长连对${max}题！` : `目前无连对记录，历史最长连对${max}题。`;
    }

    // 切屏
    if (msg.includes('切屏') || msg.includes('黄牌') || msg.includes('作弊')) {
      return '答题时切到其他应用会被记录。切屏2次以上黄牌警告，影响最终排名（正确率相同时切屏少的人排前面）。';
    }

    // 惩罚/表演/自罚
    if (msg.includes('惩罚') || msg.includes('表演') || msg.includes('自罚') || msg.includes('罚')) {
      const w = my?.wrong_count || 0;
      if (w >= 3) return `你已经错了${w}次，按规则要"自罚一杯"了！别灰心，后面还有机会。`;
      if (w >= 2) return `错了${w}次，再错一次就要"自罚一杯"了。稳住！`;
      return `目前错了${w}次。错2次要表演节目，错3次要自罚一杯，加油避免！`;
    }

    // Top/前三/前五
    if (msg.includes('top') || msg.includes('前三') || msg.includes('前五') || msg.includes('排行')) {
      return `当前Top5：${ctx.top5?.join('、') || '暂无数据'}`;
    }

    // 还有几题/进度
    if (msg.includes('几题') || msg.includes('进度') || msg.includes('还有多少')) {
      return `当前第${room?.current_round || 0}题。`;
    }

    // 打招呼
    if (msg.includes('你好') || msg.includes('hi') || msg.includes('hello') || msg.includes('嗨') || msg.includes('hey')) {
      if (my) return `嗨${my.nickname}！你目前${my.score}分，${my.group_label}组第${ctx.my_rank}名。有什么我能帮你的？`;
      return '你好！我是派对小Q，你的游戏助手。问我规则、排名、分组都可以。';
    }
  }

  // ---- Admin模式 ----
  if (mode === 'admin') {
    // 进度
    if (msg.includes('进度') || msg.includes('状态') || msg.includes('第几题')) {
      return `当前第${room?.current_round || 0}题，${ctx.answered_count || 0}/${ctx.total_players}人已答，本题正确率${ctx.round_accuracy || 0}%。`;
    }

    // 分组对比
    if (msg.includes('组') || msg.includes('对比') || msg.includes('a组') || msg.includes('b组')) {
      const a = ctx.group_a, b = ctx.group_b;
      const diff = Math.abs(a.total_score - b.total_score);
      const leader = a.total_score > b.total_score ? 'A组领先' : b.total_score > a.total_score ? 'B组领先' : '平分';
      return `A组${a.count}人${a.total_score}分 vs B组${b.count}人${b.total_score}分，${leader}${diff}分。全局正确率${ctx.overall_accuracy}%。`;
    }

    // Top/排名
    if (msg.includes('top') || msg.includes('排名') || msg.includes('排行') || msg.includes('前五')) {
      return `Top5：${ctx.top5?.join('、') || '暂无数据'}`;
    }

    // 切屏/作弊
    if (msg.includes('切屏') || msg.includes('作弊') || msg.includes('异常')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cheaters = (ctx.players || []).filter((p: any) => p.screen_switches > 0).sort((a: any, b: any) => b.screen_switches - a.screen_switches);
      if (cheaters.length === 0) return '暂无切屏异常记录。';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const top3 = cheaters.slice(0, 3).map((p: any) => `${p.nickname}(${p.screen_switches}次)`);
      return `切屏Top3：${top3.join('、')}。详见反作弊页签。`;
    }

    // 正确率
    if (msg.includes('正确率') || msg.includes('难度')) {
      return `全局正确率${ctx.overall_accuracy}%，共${ctx.total_correct}对${ctx.total_wrong}错。本题正确率${ctx.round_accuracy}%。`;
    }

    // 建议/节奏
    if (msg.includes('建议') || msg.includes('节奏') || msg.includes('该') || msg.includes('可以')) {
      const pct = ctx.total_players > 0 ? Math.round((ctx.answered_count / ctx.total_players) * 100) : 0;
      if (pct >= 80) return `${pct}%玩家已答，建议揭晓答案。`;
      if (pct >= 50) return `${pct}%已答，可以再等一会或开始计时催促。`;
      return `仅${pct}%已答，建议等待更多玩家作答。`;
    }

    // 人数
    if (msg.includes('人数') || msg.includes('多少人') || msg.includes('几个')) {
      return `共${ctx.total_players}名玩家，A组${ctx.group_a?.count}人，B组${ctx.group_b?.count}人。`;
    }
  }

  // 默认回复
  if (mode === 'admin') {
    return `管理小Q就绪。问我"进度"、"分组对比"、"Top5"、"切屏异常"、"正确率"或"建议"。`;
  }
  if (my) {
    return `${my.nickname}，你目前${my.score}分，${my.group_label}组第${ctx.my_rank}名。问我规则、排名、分组、提示都行。`;
  }
  return '我是派对小Q，问我游戏规则、排名、分组、提示都可以。加油！';
}
