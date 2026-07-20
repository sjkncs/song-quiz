'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type {
  GameRoom, GamePlayer, GameQuestion, GameRound,
  GameAnswer, GameRanking, GroupLabel, AntiCheatLog
} from '@/types/game';

// ============================================================
// 房间管理
// ============================================================

export async function createRoom(name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  // 生成6位房间码
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode = '';
  for (let i = 0; i < 6; i++) {
    roomCode += chars[Math.floor(Math.random() * chars.length)];
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

export async function updateRoomStatus(roomId: string, status: GameRoom['status']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rooms')
    .update({ status })
    .eq('id', roomId)
    .select()
    .single();
  if (error) throw new Error('更新房间状态失败');
  revalidatePath('/admin');
  return data as GameRoom;
}

export async function updateCurrentRound(roomId: string, roundNum: number) {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_players')
    .update({ group_label: group })
    .eq('id', playerId);
  if (error) throw new Error('分组失败');
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rounds')
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      question_id: questionId,
      time_limit_sec: timeLimitSec || 30,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error('创建回合失败');
  return data as GameRound;
}

export async function startRound(roundId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', roundId);
  if (error) throw new Error('开始回合失败');
}

export async function revealRound(roundId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'revealed', reveal_at: new Date().toISOString() })
    .eq('id', roundId);
  if (error) throw new Error('揭晓答案失败');
}

export async function completeRound(roundId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('game_rounds')
    .update({ status: 'completed' })
    .eq('id', roundId);
  if (error) throw new Error('完成回合失败');
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
  const supabase = await createClient();

  // 获取题目信息判断正确性
  const { data: round } = await supabase
    .from('game_rounds')
    .select('*, question:game_questions(*)')
    .eq('id', roundId)
    .single();

  if (!round) throw new Error('回合不存在');

  const question = (round as GameRound & { question: GameQuestion }).question;
  const isCorrect = question.correct_index !== null
    ? selectedOption === question.correct_index
    : selectedText === question.correct_answer;

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

// ============================================================
// 管理后台 - 批量操作
// ============================================================

export async function adminApplyScore(playerId: string, points: number) {
  const supabase = await createClient();
  const { data: player } = await supabase
    .from('game_players')
    .select('score')
    .eq('id', playerId)
    .single();
  if (!player) throw new Error('玩家不存在');

  await supabase
    .from('game_players')
    .update({ score: player.score + points })
    .eq('id', playerId);
}

export async function adminToggleCorrect(
  answerId: string,
  isCorrect: boolean
) {
  const supabase = await createClient();

  // 更新答案
  await supabase
    .from('game_answers')
    .update({
      is_correct: isCorrect,
      points_earned: isCorrect ? 100 : 0,
    })
    .eq('id', answerId);

  // 获取答案关联的玩家
  const { data: answer } = await supabase
    .from('game_answers')
    .select('player_id, player:game_players(score, correct_count, wrong_count, streak)')
    .eq('id', answerId)
    .single();

  if (answer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = answer as any;
    const p = a.player as GamePlayer;
    await supabase
      .from('game_players')
      .update({
        score: p.score + (isCorrect ? 100 : -100),
        correct_count: p.correct_count + (isCorrect ? 1 : -1),
        wrong_count: p.wrong_count + (isCorrect ? -1 : 1),
      })
      .eq('id', a.player_id);
  }
}

export async function adminGenerateRankings(roomId: string) {
  const supabase = await createClient();

  // 获取所有玩家
  const { data: players } = await supabase
    .from('game_players')
    .select('*')
    .eq('room_id', roomId);

  if (!players) return;

  // 按组排名
  for (const group of ['A', 'B'] as GroupLabel[]) {
    const groupPlayers = players
      .filter((p: GamePlayer) => p.group_label === group)
      .sort((a: GamePlayer, b: GamePlayer) => b.score - a.score);

    for (let i = 0; i < groupPlayers.length; i++) {
      const p = groupPlayers[i];
      const tier = i < 4 ? i + 1 : 4;

      await supabase
        .from('game_rankings')
        .upsert({
          room_id: roomId,
          player_id: p.id,
          group_label: group,
          rank_position: i + 1,
          award_tier: tier,
          final_score: p.score,
          correct_count: p.correct_count,
        }, { onConflict: 'room_id,player_id' });
    }
  }

  revalidatePath('/admin');
}

export async function getRankings(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('game_rankings')
    .select('*, player:game_players(nickname, group_label)')
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
