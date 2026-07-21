import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 使用 service role 绕过 RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// AI 游戏助手 API
// 功能：实时答疑 / 游戏状态查询 / 智能鼓励 / 管理分析
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      room_id,
      player_id,
      game_context,
      mode = 'player', // 'player' | 'admin'
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '缺少消息' }, { status: 400 });
    }

    // 构建游戏上下文
    const context = await buildGameContext(room_id, player_id, mode);

    // 系统提示词
    const systemPrompt = mode === 'admin'
      ? getAdminSystemPrompt(context)
      : getPlayerSystemPrompt(context);

    // 调用 LLM
    const llmKey = process.env.LLM_API_KEY;
    const llmBaseRaw = process.env.LLM_BASE_URL || 'https://api.deepseek.com';
    const llmModel = process.env.LLM_MODEL || 'deepseek-chat';

    if (!llmKey) {
      const fallback = generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode);
      return NextResponse.json({ reply: fallback });
    }

    // 规范化 base URL，避免 /v1/v1 重复
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
        const fallback = generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode);
        return NextResponse.json({ reply: fallback });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答。';
      return NextResponse.json({ reply });
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.warn('LLM fetch failed, using fallback:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
      const fallback = generateFallbackReply(messages[messages.length - 1]?.content || '', context, mode);
      return NextResponse.json({ reply: fallback });
    }
  } catch (error) {
    console.error('Game AI error:', error);
    return NextResponse.json({
      reply: 'AI助手暂时离线，请稍后再试。'
    }, { status: 200 });
  }
}

// ============================================================
// 构建游戏上下文
// ============================================================

async function buildGameContext(roomId: string, playerId: string, mode: string) {
  const supabase = getAdminClient();
  const ctx: Record<string, unknown> = { mode };

  if (!roomId) return ctx;

  // 房间信息
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  ctx.room = room;

  // 玩家列表
  const { data: players } = await supabase
    .from('game_players')
    .select('*')
    .eq('room_id', roomId)
    .order('score', { ascending: false });
  ctx.players = players;
  ctx.total_players = players?.length || 0;

  // 分组统计
  const groupA = players?.filter(p => p.group_label === 'A') || [];
  const groupB = players?.filter(p => p.group_label === 'B') || [];
  ctx.group_a = { count: groupA.length, total_score: groupA.reduce((s, p) => s + p.score, 0) };
  ctx.group_b = { count: groupB.length, total_score: groupB.reduce((s, p) => s + p.score, 0) };

  // 当前回合
  if (room?.current_round > 0) {
    const { data: round } = await supabase
      .from('game_rounds')
      .select('*, question:game_questions(*)')
      .eq('room_id', roomId)
      .eq('round_number', room.current_round)
      .single();
    ctx.current_round = round;

    // 本题答题情况
    if (round) {
      const { data: answers } = await supabase
        .from('game_answers')
        .select('*, player:game_players(nickname, group_label)')
        .eq('round_id', round.id);
      ctx.round_answers = answers;
      ctx.answered_count = answers?.length || 0;
    }
  }

  // 当前玩家信息
  if (playerId) {
    const player = players?.find(p => p.id === playerId);
    ctx.my_player = player;
    // 计算排名
    if (player) {
      const myGroup = players?.filter(p => p.group_label === player.group_label) || [];
      const sorted = [...myGroup].sort((a, b) => b.score - a.score);
      const myRank = sorted.findIndex(p => p.id === playerId) + 1;
      ctx.my_rank = myRank;
      ctx.my_group_size = myGroup.length;
    }
  }

  return ctx;
}

// ============================================================
// 系统提示词
// ============================================================

function getPlayerSystemPrompt(ctx: Record<string, unknown>): string {
  const room = ctx.room as Record<string, unknown> | undefined;
  const myPlayer = ctx.my_player as Record<string, unknown> | undefined;

  return `你是"脑力派对"游戏的AI助手，名叫"派对助手"。你的职责是帮助玩家享受游戏、解答疑问、提供鼓励。

当前游戏状态：
- 房间: ${room?.name || '音乐竞猜PK'}
- 状态: ${room?.status === 'waiting' ? '等待中' : room?.status === 'playing' ? '进行中' : room?.status === 'finished' ? '已结束' : '准备中'}
- 当前第${room?.current_round || 0}题（共${(room?.config as Record<string, unknown>)?.total_questions || 40}题）
${myPlayer ? `- 玩家: ${myPlayer.nickname}，${myPlayer.group_label}组，积分${myPlayer.score}，答对${myPlayer.correct_count}题，连对${myPlayer.streak}题` : ''}
${ctx.my_rank ? `- 你在组内排名第${ctx.my_rank}名（共${ctx.my_group_size}人）` : ''}
- A组总分: ${(ctx.group_a as Record<string, unknown>)?.total_score || 0} | B组总分: ${(ctx.group_b as Record<string, unknown>)?.total_score || 0}

你的角色规则：
1. 用简短、活泼、友好的语气回复（适合手机屏幕阅读）
2. 不直接告诉玩家答案，但可以给提示（如"这首歌是90年代的经典"）
3. 当玩家连续答对时给予热情鼓励
4. 当玩家答错时安慰并鼓励
5. 回答游戏规则问题（积分规则、分组规则、反作弊规则等）
6. 可以适当聊一些音乐/影视相关的话题
7. 每次回复控制在2-3句话以内
8. 不要使用emoji`;
}

function getAdminSystemPrompt(ctx: Record<string, unknown>): string {
  const room = ctx.room as Record<string, unknown> | undefined;

  return `你是"脑力派对"的管理AI助手，协助主持人管理游戏。

当前游戏状态：
- 房间: ${room?.name || '音乐竞猜PK'}
- 状态: ${room?.status || '未知'}
- 当前第${room?.current_round || 0}题
- 玩家总数: ${ctx.total_players || 0}
- A组: ${(ctx.group_a as Record<string, unknown>)?.count || 0}人，总分${(ctx.group_a as Record<string, unknown>)?.total_score || 0}
- B组: ${(ctx.group_b as Record<string, unknown>)?.count || 0}人，总分${(ctx.group_b as Record<string, unknown>)?.total_score || 0}
- 本题已答: ${ctx.answered_count || 0}/${ctx.total_players || 0}人

你可以：
1. 提供实时数据分析（每题正确率、平均用时、切屏次数）
2. 建议游戏节奏（"大部分人已作答，可以揭晓答案了"）
3. 报告异常情况（"XX玩家切屏3次，建议关注"）
4. 回答管理问题
5. 用简洁专业的语气回复`;
}

// ============================================================
// 预设回复（无LLM时的降级方案）
// ============================================================

function generateFallbackReply(
  message: string,
  ctx: Record<string, unknown>,
  mode: string
): string {
  const msg = message.toLowerCase();

  // 规则类问题
  if (msg.includes('规则') || msg.includes('怎么玩')) {
    return '游戏规则很简单：听音频/看视频/读题目，选择或输入正确答案。每题100分，连续答对有额外激励。注意不要切屏到其他应用哦，会被记录的！';
  }
  if (msg.includes('积分') || msg.includes('分数') || msg.includes('加分')) {
    return '每答对一题得100分，连续答对会有额外激励消息。所有题目积分相同，最终按总分排名。';
  }
  if (msg.includes('切屏') || msg.includes('黄牌')) {
    return '答题时如果切换到其他应用会被记录切屏次数。切屏超过2次会收到黄牌警告，请注意保持在游戏页面哦。';
  }
  if (msg.includes('排名') || msg.includes('名次')) {
    const myRank = ctx.my_rank;
    const myGroup = ctx.my_group_size;
    if (myRank) {
      return `你目前在组内排第${myRank}名（共${myGroup}人）。继续加油，争取更高排名！`;
    }
    return '排名会在游戏结束后公布，按组内总分排序，前四名分别获得一、二、三、四等奖。';
  }
  if (msg.includes('提示') || msg.includes('hint') || msg.includes('帮我')) {
    return '我没法直接告诉你答案哦，但可以提示你：仔细听音频的旋律特点，或者回忆题目描述的关键信息。相信自己！';
  }
  if (msg.includes('你好') || msg.includes('hi') || msg.includes('hello') || msg.includes('嗨')) {
    return '你好！我是派对助手，你的游戏助手。有任何关于游戏的问题都可以问我哦。';
  }

  // 管理模式的预设回复
  if (mode === 'admin') {
    if (msg.includes('状态') || msg.includes('进度')) {
      return `当前游戏第${ctx.room ? (ctx.room as Record<string, unknown>).current_round : 0}题，A组总分${(ctx.group_a as Record<string, unknown>)?.total_score || 0}，B组总分${(ctx.group_b as Record<string, unknown>)?.total_score || 0}，共${ctx.total_players || 0}名玩家参与。`;
    }
    if (msg.includes('切屏') || msg.includes('作弊')) {
      return '请在反作弊标签页查看详细的切屏检测记录和黄牌标记。';
    }
    return '我是管理助手，可以帮你分析游戏数据、监控玩家状态。试试问我"当前进度"或"A组B组对比"。';
  }

  return '我是派对助手，你的游戏助手。你可以问我游戏规则、积分方式、排名情况，或者让我给你一些提示。加油！';
}
