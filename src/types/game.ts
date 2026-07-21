// ============================================================
// 脑力派对 - 全局类型定义
// ============================================================

// ---- 房间状态 ----
export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'finished';

// ---- 题目类型 ----
export type QuestionType = 'video_clip' | 'audio_clip' | 'text_qa' | 'song_guess' | 'dialect';

// ---- 难度 ----
export type Difficulty = 'easy' | 'normal' | 'hard' | 'bonus';

// ---- 组别 ----
export type GroupLabel = 'A' | 'B';

// ---- 回合状态 ----
export type RoundStatus = 'pending' | 'active' | 'revealed' | 'completed';

// ---- 反作弊事件 ----
export type AntiCheatEventType = 'screen_switch' | 'yellow_card' | 'answer_time_warning';

// ---- 游戏房间 ----
export interface GameRoom {
  id: string;
  room_code: string;
  name: string;
  status: RoomStatus;
  host_user_id: string | null;
  config: RoomConfig;
  current_round: number;
  created_at: string;
  updated_at: string;
}

export interface RoomConfig {
  total_questions: number;
  time_per_question_sec: number;
  points_per_correct: number;
  streak_bonus_message: string;
  wrong_warning_threshold: number;
  wrong_warning_message: string;
}

// ---- 玩家 ----
export interface GamePlayer {
  id: string;
  room_id: string;
  auth_user_id: string | null;
  real_name: string | null;
  nickname: string;
  group_label: GroupLabel | null;
  score: number;
  correct_count: number;
  wrong_count: number;
  streak: number;
  max_streak: number;
  is_online: boolean;
  joined_at: string;
}

// ---- 题目 ----
export interface GameQuestion {
  id: string;
  index_num: number;
  type: QuestionType;
  question_text: string;
  options: QuestionOption[] | null;
  correct_answer: string;
  correct_index: number | null;
  answer_explanation: string | null;
  media_url: string | null;
  media_type: 'video' | 'audio' | 'image' | null;
  source_info: string | null;
  difficulty: Difficulty;
  is_bonus: boolean;
  bonus_message: string;
  is_active: boolean;
}

export interface QuestionOption {
  index: number;
  text: string;
}

// ---- 回合 ----
export interface GameRound {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  status: RoundStatus;
  started_at: string | null;
  time_limit_sec: number;
  reveal_at: string | null;
  points_multiplier: number;
  media_unlocked: boolean;
  // join
  question?: GameQuestion;
}

// ---- 答题记录 ----
export interface GameAnswer {
  id: string;
  round_id: string;
  player_id: string;
  room_id: string;
  selected_option: number | null;
  selected_text: string | null;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  screen_switches: number;
  has_yellow_card: boolean;
  submitted_at: string;
}

// ---- 反作弊日志 ----
export interface AntiCheatLog {
  id: string;
  room_id: string;
  round_id: string | null;
  player_id: string;
  event_type: AntiCheatEventType;
  details: Record<string, unknown>;
  created_at: string;
}

// ---- 排名 ----
export interface GameRanking {
  id: string;
  room_id: string;
  player_id: string;
  group_label: GroupLabel | null;
  rank_position: number;
  award_tier: number | null;
  final_score: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  accuracy_rate: number;
  avg_time_ms: number | null;
  total_time_ms: number;
  total_screen_switches: number;
  // join
  player?: GamePlayer;
}

// ---- 游戏事件 ----
export interface GameEvent {
  id: string;
  room_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ---- Realtime 广播消息 ----
export type GameBroadcastType =
  | 'round_start'
  | 'round_reveal'
  | 'round_complete'
  | 'game_start'
  | 'game_finish'
  | 'player_join'
  | 'player_answer'
  | 'screen_switch'
  | 'yellow_card'
  | 'timer_sync'
  | 'score_update'
  | 'media_unlock'
  | 'admin_override';

export interface GameBroadcast {
  type: GameBroadcastType;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ---- 前端游戏状态 ----
export interface GameState {
  room: GameRoom | null;
  currentPlayer: GamePlayer | null;
  players: GamePlayer[];
  currentRound: (GameRound & { question?: GameQuestion }) | null;
  myAnswer: GameAnswer | null;
  rankings: GameRanking[];
  timeRemaining: number;
  isTimerRunning: boolean;
  streakMessage: string;
  warningMessage: string;
}

// ---- 管理后台 - 每题统计 ----
export interface RoundStats {
  round_id: string;
  round_number: number;
  question: GameQuestion;
  total_answers: number;
  correct_count: number;
  accuracy: number;
  avg_time_ms: number;
  answers: GameAnswer[];
}

// ---- 管理后台 - 玩家详情 ----
export interface AdminPlayerDetail extends GamePlayer {
  answers: GameAnswer[];
  anti_cheat_logs: AntiCheatLog[];
  ranking: GameRanking | null;
}
