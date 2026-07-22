'use server';

import { createClient, createAdminClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type {
  GameRoom, GamePlayer, GameQuestion, GameRound,
  GameAnswer, GameRanking, GroupLabel, AntiCheatLog
} from '@/types/game';

// ============================================================
// 房间管理
// ============================================================

export async function createRoom(name?: string, customCode?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  let roomCode: string;

  if (customCode && customCode.trim().length > 0) {
    // 使用自定义房间码
    roomCode = customCode.trim().toUpperCase();
    if (roomCode.length < 4 || roomCode.length > 8) {
      throw new Error('房间码需要4-8位字符');
    }
    if (!/^[A-Z0-9]+$/.test(roomCode)) {
      throw new Error('房间码只能包含字母和数字');
    }
    // 检查是否已被使用（仅限未结束的房间）
    const { data: existing } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('room_code', roomCode)
      .neq('status', 'finished')
      .maybeSingle();
    if (existing) {
      throw new Error('该房间码已被使用，请换一个');
    }
  } else {
    // 生成6位随机房间码
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    roomCode = '';
    for (let i = 0; i < 6; i++) {
      roomCode += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode,
      name: name || '音乐竞猜PK',
      host_user_id: user.id,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw new Error('创建房间失败: ' + error.message);
  revalidatePath('/admin');
  return data as GameRoom;
}

export async function getRoom(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error) throw new Error('房间不存在');
  return data as GameRoom;
}

export async function getRoomByCode(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', code.toUpperCase())
    .single();
  if (error) throw new Error('房间码无效');
  return data as GameRoom;
}

export async function getAllRooms() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('game_rooms')
    .select('*, player_count:game_players(count)')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []) as (GameRoom & { player_count: { count: number }[] })[];
}

export async function deleteRoom(roomId: string) {
  const supabase = await createAdminClient();
  await supabase.from('game_rankings').delete().eq('room_id', roomId);
  await supabase.from('game_answers').delete().eq('room_id', roomId);
  await supabase.from('game_rounds').delete().eq('room_id', roomId);
  await supabase.from('game_players').delete().eq('room_id', roomId);
  await supabase.from('anti_cheat_logs').delete().eq('room_id', roomId);
  await supabase.from('game_rooms').delete().eq('id', roomId);
  revalidatePath('/admin');
}

export async function updateRoomStatus(roomId: string, status: GameRoom['status']) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .update({ status })
    .eq('id', roomId)
    .select()
    .single();
  if (error) {
    console.error('updateRoomStatus error:', error);
    throw new Error('更新房间状态失败');
  }
  revalidatePath('/admin');
  return data as GameRoom;
}

export async function updateCurrentRound(roomId: string, roundNum: number) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rooms')
    .update({ current_round: roundNum })
    .eq('id', roomId);
  if (error) throw new Error('更新回合失败');
}

// ============================================================
// 玩家管理
// ============================================================

export async function joinRoom(
  roomId: string,
  realName: string,
  nickname: string,
  group: GroupLabel
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  // 检查是否已在房间
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('room_id', roomId)
    .eq('auth_user_id', user.id)
    .single();

  if (existing) {
    const { data } = await supabase
      .from('game_players')
      .select('*')
      .eq('id', existing.id)
      .single();
    return data as GamePlayer;
  }

  const { data, error } = await supabase
    .from('game_players')
    .insert({
      room_id: roomId,
      auth_user_id: user.id,
      real_name: realName,
      nickname,
      group_label: group,
    })
    .select()
    .single();

  if (error) throw new Error('加入房间失败: ' + error.message);
  return data as GamePlayer;
}

export async function getPlayers(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  if (error) throw new Error('获取玩家列表失败');
  return data as GamePlayer[];
}

export async function getMyPlayer(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('game_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('auth_user_id', user.id)
    .single();
  return data as GamePlayer | null;
}

export async function assignGroup(playerId: string, group: GroupLabel) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_players')
    .update({ group_label: group })
    .eq('id', playerId);
  if (error) throw new Error('分组失败');
}

export async function removePlayer(playerId: string) {
  const supabase = await createAdminClient();
  // 先删除该玩家的排名记录
  const { error: rankErr } = await supabase.from('game_rankings').delete().eq('player_id', playerId);
  if (rankErr) console.warn('清理排名记录失败:', rankErr.message);
  // 删除该玩家的所有答题记录
  const { error: ansErr } = await supabase.from('game_answers').delete().eq('player_id', playerId);
  if (ansErr) console.warn('清理答题记录失败:', ansErr.message);
  // 最后删除玩家
  const { error } = await supabase
    .from('game_players')
    .delete()
    .eq('id', playerId);
  if (error) throw new Error('移除玩家失败');
  revalidatePath('/admin');
}

export async function updatePlayerScore(
  playerId: string,
  scoreDelta: number,
  isCorrect: boolean
) {
  const supabase = await createClient();
  const { data: player } = await supabase
    .from('game_players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (!player) return;

  const newStreak = isCorrect ? player.streak + 1 : 0;
  const updates: Partial<GamePlayer> = {
    score: player.score + scoreDelta,
    correct_count: isCorrect ? player.correct_count + 1 : player.correct_count,
    wrong_count: isCorrect ? player.wrong_count : player.wrong_count + 1,
    streak: newStreak,
    max_streak: Math.max(player.max_streak, newStreak),
  };

  const { error } = await supabase
    .from('game_players')
    .update(updates)
    .eq('id', playerId);
  if (error) throw new Error('更新分数失败');
}

// ============================================================
// 题目管理
// ============================================================

export async function getActiveQuestions(limit?: number) {
  const supabase = await createClient();
  let query = supabase
    .from('game_questions')
    .select('*')
    .eq('is_active', true)
    .order('index_num', { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error('获取题目失败');
  return data as GameQuestion[];
}

export async function getQuestion(questionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_questions')
    .select('*')
    .eq('id', questionId)
    .single();
  if (error) throw new Error('题目不存在');
  return data as GameQuestion;
}

export async function updateQuestion(questionId: string, updates: Partial<GameQuestion>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_questions')
    .update(updates)
    .eq('id', questionId);
  if (error) throw new Error('更新题目失败');
}

// ============================================================
// 回合管理
// ============================================================

export async function createRound(
  roomId: string,
  roundNumber: number,
  questionId: string,
  timeLimitSec?: number
) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('game_rounds')
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      question_id: questionId,
      time_limit_sec: timeLimitSec || 60,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error('创建回合失败');
  return data as GameRound;
}

export async function startRound(roundId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', roundId);
  if (error) throw new Error('开始回合失败');
}

export async function revealRound(roundId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'revealed', reveal_at: new Date().toISOString() })
    .eq('id', roundId);
  if (error) throw new Error('揭晓答案失败');
}

// 主持人开放/关闭媒体权限（视频、音频、歌词）
export async function toggleMediaUnlock(roundId: string, unlocked: boolean) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ media_unlocked: unlocked })
    .eq('id', roundId);
  if (error) throw new Error('切换媒体权限失败');
}

// ============================================================
// 抢答（Buzz-In）
// ============================================================

export async function buzzIn(roundId: string, playerId: string) {
  const supabase = await createAdminClient();

  // 检查是否已有人抢答
  const { data: round } = await supabase
    .from('game_rounds')
    .select('buzzed_in_player_id')
    .eq('id', roundId)
    .single();

  if (round?.buzzed_in_player_id) {
    throw new Error('已经有人抢答了');
  }

  const { error } = await supabase
    .from('game_rounds')
    .update({ buzzed_in_player_id: playerId })
    .eq('id', roundId)
    .is('buzzed_in_player_id', null); // 原子锁定，防止并发

  if (error) throw new Error('抢答失败');
}

export async function adminResetBuzzIn(roundId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ buzzed_in_player_id: null })
    .eq('id', roundId);
  if (error) throw new Error('重置抢答失败');
}

export async function adminAssignBuzzIn(roundId: string, playerId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ buzzed_in_player_id: playerId })
    .eq('id', roundId);
  if (error) throw new Error('指定答题人失败');
}

// ============================================================
// AI 辅助判题（主观题）
// ============================================================

async function aiJudgeAnswer(
  correctAnswer: string,
  playerAnswer: string,
  questionText: string
): Promise<boolean> {
  // 统一的回退匹配函数（LLM 不可用时使用）
  const fallbackMatch = (): boolean => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[\s""''、，。,.!?！？：:;；\-\(\)（）\[\]【】]/g, '');
    const player = normalize(playerAnswer);

    // 从正确答案中提取关键词：
    // 1. 提取所有《...》中的内容作为关键词
    const bracketMatches = [...correctAnswer.matchAll(/《([^》]+)》/g)].map(m => normalize(m[1]));
    // 2. 按 / 或 | 拆分后的内容也作为关键词
    const slashKeywords = correctAnswer.split(/[\/|]/).map(k => normalize(k.replace(/[《》]/g, ''))).filter(Boolean);
    // 3. 合并去重
    const allKeywords = [...new Set([...bracketMatches, ...slashKeywords])].filter(Boolean);

    // 如果没有提取到关键词，用整个正确答案
    const effectiveKeywords = allKeywords.length > 0 ? allKeywords : [normalize(correctAnswer)];

    // 玩家答案中包含任一关键词即判对
    return effectiveKeywords.some(k => k.length >= 2 && player.includes(k));
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
      console.warn('AI judge LLM error:', response.status);
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

export async function completeRound(roundId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'completed' })
    .eq('id', roundId);
  if (error) throw new Error('完成回合失败');
}

// 返回上一题：将当前回合标记为完成，重新激活上一题
export async function goBackRound(roomId: string) {
  const supabase = await createAdminClient();

  // 获取当前回合号
  const { data: room } = await supabase
    .from('game_rooms')
    .select('current_round')
    .eq('id', roomId)
    .single();

  if (!room || !room.current_round || room.current_round <= 1) {
    throw new Error('已经是第一题了');
  }

  const prevRoundNum = room.current_round - 1;

  // 将当前回合设为 completed
  const { data: currentRound } = await supabase
    .from('game_rounds')
    .select('id')
    .eq('room_id', roomId)
    .eq('round_number', room.current_round)
    .single();

  if (currentRound) {
    await supabase
      .from('game_rounds')
      .update({ status: 'completed' })
      .eq('id', currentRound.id);
  }

  // 找到上一题的 round 并重新激活
  const { data: prevRound } = await supabase
    .from('game_rounds')
    .select('id')
    .eq('room_id', roomId)
    .eq('round_number', prevRoundNum)
    .single();

  if (!prevRound) throw new Error('找不到上一题');

  // 重置上一题状态为 active，同时清除抢答状态
  await supabase
    .from('game_rounds')
    .update({ status: 'active', buzzed_in_player_id: null })
    .eq('id', prevRound.id);

  // 删除上一题的所有答题记录（让玩家重新作答）
  await supabase
    .from('game_answers')
    .delete()
    .eq('round_id', prevRound.id);

  // 更新房间的 current_round
  await supabase
    .from('game_rooms')
    .update({ current_round: prevRoundNum })
    .eq('id', roomId);

  revalidatePath('/admin');
  return prevRound;
}

export async function getCurrentRound(roomId: string) {
  const supabase = await createClient();
  const { data: room } = await supabase
    .from('game_rooms')
    .select('current_round')
    .eq('id', roomId)
    .single();

  if (!room || room.current_round === 0) return null;

  const { data, error } = await supabase
    .from('game_rounds')
    .select('*, question:game_questions(*)')
    .eq('room_id', roomId)
    .eq('round_number', room.current_round)
    .single();
  if (error) return null;
  return data as GameRound & { question: GameQuestion };
}

export async function getRoundByNumber(roomId: string, roundNumber: number) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('game_rounds')
    .select('*, question:game_questions(*)')
    .eq('room_id', roomId)
    .eq('round_number', roundNumber)
    .maybeSingle();
  return data as (GameRound & { question: GameQuestion }) | null;
}

export async function resetRound(roundId: string) {
  const supabase = await createAdminClient();
  // 清除该轮的答题记录和抢答状态
  await supabase.from('game_answers').delete().eq('round_id', roundId);
  await supabase
    .from('game_rounds')
    .update({ status: 'active', buzzed_in_player_id: null, started_at: new Date().toISOString() })
    .eq('id', roundId);
}

// ============================================================
// 答题
// ============================================================

export async function submitAnswer(
  roundId: string,
  playerId: string,
  roomId: string,
  selectedOption: number,
  selectedText: string,
  timeTakenMs: number,
  screenSwitches: number
) {
  const supabase = await createAdminClient();

  // 获取题目信息 + 抢答状态
  const { data: round } = await supabase
    .from('game_rounds')
    .select('*, question:game_questions(*)')
    .eq('id', roundId)
    .single();

  if (!round) throw new Error('回合不存在');

  // 抢答锁定检查：如果有人抢答，只允许该玩家答题
  const roundFull = round as GameRound & { question: GameQuestion; buzzed_in_player_id?: string | null };
  if (roundFull.buzzed_in_player_id && roundFull.buzzed_in_player_id !== playerId) {
    throw new Error('本轮已被其他玩家抢答，请等待下一题');
  }

  const question = roundFull.question;
  let isCorrect: boolean;

  if (question.correct_index !== null && question.correct_index !== undefined) {
    // 选择题：精确匹配选项索引（DB 可能返回字符串，需要 Number 转换）
    isCorrect = selectedOption === Number(question.correct_index);
  } else {
    // 主观题：AI 辅助语义判题
    isCorrect = await aiJudgeAnswer(
      question.correct_answer,
      selectedText,
      question.question_text
    );
  }

  // 检查是否黄牌（切屏超过2次）
  const hasYellowCard = screenSwitches >= 2;

  // 计算积分（管理后台统一加分，这里先记录）
  const pointsEarned = isCorrect ? 100 : 0;

  const { data, error } = await supabase
    .from('game_answers')
    .insert({
      round_id: roundId,
      player_id: playerId,
      room_id: roomId,
      selected_option: selectedOption,
      selected_text: selectedText,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
      points_earned: pointsEarned,
      screen_switches: screenSwitches,
      has_yellow_card: hasYellowCard,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('你已经回答过了');
    throw new Error('提交答案失败');
  }

  // 记录反作弊日志
  if (screenSwitches > 0) {
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

  // 更新玩家积分和统计（使用原子递增避免竞态）
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

  return data as GameAnswer;
}

export async function getRoundAnswers(roundId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_answers')
    .select('*, player:game_players(nickname, group_label)')
    .eq('round_id', roundId)
    .order('submitted_at', { ascending: true });
  if (error) throw new Error('获取答题记录失败');
  return data;
}

export async function getMyAnswer(roundId: string, playerId: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('game_answers')
    .select('*')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .maybeSingle();
  return data as GameAnswer | null;
}

// ============================================================
// 管理后台 - 批量操作
// ============================================================

export async function adminApplyScore(playerId: string, points: number) {
  const supabase = await createClient();
  await supabase.rpc('update_player_score_atomic', {
    p_player_id: playerId,
    p_score_delta: points,
    p_correct_delta: 0,
    p_wrong_delta: 0,
    p_new_streak: -1, // -1 means don't change streak
  });
}

export async function adminSetScore(playerId: string, newScore: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_players')
    .update({ score: Math.max(0, newScore) })
    .eq('id', playerId);
  if (error) throw new Error('设置积分失败');
}

export async function getBonusWinners(roomId: string) {
  const supabase = await createAdminClient();
  // 找出所有彩蛋题
  const { data: bonusQuestions } = await supabase
    .from('game_questions')
    .select('id, bonus_message')
    .eq('is_bonus', true);

  if (!bonusQuestions || bonusQuestions.length === 0) return [];

  const bonusIds = bonusQuestions.map(q => q.id);
  const bonusMap = new Map(bonusQuestions.map(q => [q.id, q.bonus_message || '请领取奖励']));

  // 找出答对彩蛋题的玩家
  const { data: answers } = await supabase
    .from('game_answers')
    .select('player_id, round_id, player:game_players(nickname)')
    .eq('room_id', roomId)
    .eq('is_correct', true);

  if (!answers) return [];

  // 通过 round 关联 question
  const { data: rounds } = await supabase
    .from('game_rounds')
    .select('id, question_id')
    .eq('room_id', roomId);

  const roundQuestionMap = new Map((rounds || []).map(r => [r.id, r.question_id]));

  const winners: { player_id: string; nickname: string; bonus_message: string }[] = [];
  const seen = new Set<string>();

  for (const ans of answers) {
    const qId = roundQuestionMap.get((ans as { round_id: string }).round_id);
    if (qId && bonusIds.includes(qId)) {
      const key = `${ans.player_id}-${qId}`;
      if (!seen.has(key)) {
        seen.add(key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const playerData = (ans as any).player;
        winners.push({
          player_id: ans.player_id,
          nickname: playerData?.nickname || '未知',
          bonus_message: bonusMap.get(qId) || '请领取奖励',
        });
      }
    }
  }

  return winners;
}

export async function adminToggleCorrect(
  answerId: string,
  isCorrect: boolean
) {
  const supabase = await createAdminClient();

  // 先读取答案的旧状态
  const { data: answer } = await supabase
    .from('game_answers')
    .select('player_id, is_correct, player:game_players(score, correct_count, wrong_count)')
    .eq('id', answerId)
    .single();

  if (!answer) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = answer as any;
  const wasCorrect: boolean = a.is_correct;
  const p = a.player as GamePlayer;

  // 如果状态没变化则跳过
  if (wasCorrect === isCorrect) return;

  // 计算分数增量（从旧状态到新状态的差值）
  const scoreDelta = isCorrect ? 100 : -100;
  const correctDelta = isCorrect ? 1 : -1;
  const wrongDelta = isCorrect ? -1 : 1;

  // 更新答案
  await supabase
    .from('game_answers')
    .update({
      is_correct: isCorrect,
      points_earned: isCorrect ? 100 : 0,
    })
    .eq('id', answerId);

  // 更新玩家统计
  await supabase
    .from('game_players')
    .update({
      score: Math.max(0, p.score + scoreDelta),
      correct_count: Math.max(0, p.correct_count + correctDelta),
      wrong_count: Math.max(0, p.wrong_count + wrongDelta),
    })
    .eq('id', a.player_id);
}

export async function adminGenerateRankings(roomId: string) {
  const supabase = await createAdminClient();

  // 获取所有玩家
  const { data: players } = await supabase
    .from('game_players')
    .select('*')
    .eq('room_id', roomId);

  if (!players || players.length === 0) return;

  // 获取所有答题记录，用于计算时间和作弊统计
  const { data: allAnswers } = await supabase
    .from('game_answers')
    .select('*')
    .eq('room_id', roomId);

  // 按玩家聚合统计
  const playerStats = new Map<string, {
    totalTime: number;
    totalSwitches: number;
    answeredCount: number;
  }>();

  for (const ans of (allAnswers || [])) {
    const existing = playerStats.get(ans.player_id) || { totalTime: 0, totalSwitches: 0, answeredCount: 0 };
    existing.totalTime += ans.time_taken_ms || 0;
    existing.totalSwitches += ans.screen_switches || 0;
    existing.answeredCount += 1;
    playerStats.set(ans.player_id, existing);
  }

  // 计算每个玩家的排名数据
  interface RankData {
    player: GamePlayer;
    accuracyRate: number;
    avgTime: number;
    totalTime: number;
    totalSwitches: number;
    totalQuestions: number;
  }

  const rankDataList: RankData[] = players.map((p: GamePlayer) => {
    const stats = playerStats.get(p.id) || { totalTime: 0, totalSwitches: 0, answeredCount: 0 };
    const totalQ = p.correct_count + p.wrong_count;
    const accuracy = totalQ > 0 ? p.correct_count / totalQ : 0;
    const avgTime = stats.answeredCount > 0 ? Math.round(stats.totalTime / stats.answeredCount) : 0;
    return {
      player: p,
      accuracyRate: accuracy,
      avgTime,
      totalTime: stats.totalTime,
      totalSwitches: stats.totalSwitches,
      totalQuestions: totalQ,
    };
  });

  // 排序规则：正确率降序 → 平均用时升序 → 切屏次数升序 → 分数降序
  const sortFn = (a: RankData, b: RankData) => {
    if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
    if (a.avgTime !== b.avgTime) return a.avgTime - b.avgTime;
    if (a.totalSwitches !== b.totalSwitches) return a.totalSwitches - b.totalSwitches;
    return b.player.score - a.player.score;
  };

  // 总排名 — 先清除旧排名，避免被移除的玩家残留
  const overallSorted = [...rankDataList].sort(sortFn);
  await supabase.from('game_rankings').delete().eq('room_id', roomId);

  // 批量 upsert 代替逐条写入（50个玩家 = 1次查询 vs 50次查询）
  const rankingRows = overallSorted.map((r, i) => ({
    room_id: roomId,
    player_id: r.player.id,
    group_label: r.player.group_label,
    rank_position: i + 1,
    award_tier: Math.min(i + 1, 4),
    final_score: r.player.score,
    correct_count: r.player.correct_count,
    wrong_count: r.player.wrong_count,
    total_questions: r.totalQuestions,
    accuracy_rate: Math.round(r.accuracyRate * 10000) / 100,
    avg_time_ms: r.avgTime,
    total_time_ms: r.totalTime,
    total_screen_switches: r.totalSwitches,
  }));

  if (rankingRows.length > 0) {
    await supabase.from('game_rankings').upsert(rankingRows, { onConflict: 'room_id,player_id' });
  }

  revalidatePath('/admin');
}

export async function getRankings(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rankings')
    .select('*, player:game_players(nickname, real_name, group_label)')
    .eq('room_id', roomId)
    .order('rank_position', { ascending: true });
  if (error) throw new Error('获取排名失败');
  return data as GameRanking[];
}

// ============================================================
// 认证（简化版）
// ============================================================

export async function signInAnonymously(nickname: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { nickname } },
  });
  if (error) throw new Error('登录失败: ' + error.message);
  return data;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
