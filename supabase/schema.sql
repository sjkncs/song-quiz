-- ============================================================
-- 猜歌王 PK 对战系统 - 数据库架构
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. 游戏房间
-- ============================================================
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(8) UNIQUE NOT NULL,
  name VARCHAR(100) DEFAULT '音乐竞猜PK',
  status VARCHAR(20) DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'starting', 'playing', 'finished')),
  host_user_id UUID REFERENCES auth.users(id),
  config JSONB DEFAULT '{
    "total_questions": 40,
    "time_per_question_sec": 30,
    "points_per_correct": 100,
    "streak_bonus_message": "真棒！你已超过{n}%的挑战者",
    "wrong_warning_threshold": 2,
    "wrong_warning_message": "注意！你已答错{n}次，再错要小心哦"
  }'::jsonb,
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_code ON game_rooms(room_code);
CREATE INDEX idx_rooms_status ON game_rooms(status);

-- ============================================================
-- 2. 游戏玩家
-- ============================================================
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  real_name VARCHAR(50),
  nickname VARCHAR(50) NOT NULL,
  group_label CHAR(1) CHECK (group_label IN ('A', 'B')),
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_room ON game_players(room_id);
CREATE INDEX idx_players_group ON game_players(room_id, group_label);

-- ============================================================
-- 3. 题库
-- ============================================================
CREATE TABLE IF NOT EXISTS game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_num INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL
    CHECK (type IN ('video_clip', 'audio_clip', 'text_qa', 'song_guess', 'dialect')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  correct_index INTEGER,
  answer_explanation TEXT,
  media_url TEXT,
  media_type VARCHAR(10) CHECK (media_type IN ('video', 'audio', 'image')),
  source_info VARCHAR(200),
  difficulty VARCHAR(10) DEFAULT 'normal'
    CHECK (difficulty IN ('easy', 'normal', 'hard', 'bonus')),
  is_bonus BOOLEAN DEFAULT false,
  bonus_message VARCHAR(200) DEFAULT '本题较难，答对可额外获得周边奖励！',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_active ON game_questions(is_active);
CREATE INDEX idx_questions_index ON game_questions(index_num);

-- ============================================================
-- 4. 游戏回合（每道题一个回合）
-- ============================================================
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_id UUID NOT NULL REFERENCES game_questions(id),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'revealed', 'completed')),
  started_at TIMESTAMPTZ,
  time_limit_sec INTEGER DEFAULT 30,
  reveal_at TIMESTAMPTZ,
  points_multiplier INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(room_id, round_number)
);

CREATE INDEX idx_rounds_room ON game_rounds(room_id, round_number);

-- ============================================================
-- 5. 玩家答题记录
-- ============================================================
CREATE TABLE IF NOT EXISTS game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  selected_option INTEGER,
  selected_text TEXT,
  is_correct BOOLEAN DEFAULT false,
  time_taken_ms INTEGER,
  points_earned INTEGER DEFAULT 0,
  screen_switches INTEGER DEFAULT 0,
  has_yellow_card BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(round_id, player_id)
);

CREATE INDEX idx_answers_round ON game_answers(round_id);
CREATE INDEX idx_answers_player ON game_answers(player_id);

-- ============================================================
-- 6. 反作弊日志
-- ============================================================
CREATE TABLE IF NOT EXISTS anti_cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL
    CHECK (event_type IN ('screen_switch', 'yellow_card', 'answer_time_warning')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anticheat_room ON anti_cheat_logs(room_id);
CREATE INDEX idx_anticheat_player ON anti_cheat_logs(player_id);

-- ============================================================
-- 7. 排名记录
-- ============================================================
CREATE TABLE IF NOT EXISTS game_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  group_label CHAR(1),
  rank_position INTEGER NOT NULL,
  award_tier INTEGER CHECK (award_tier IN (1, 2, 3, 4)),
  final_score INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  avg_time_ms INTEGER,
  total_screen_switches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(room_id, player_id)
);

CREATE INDEX idx_rankings_room ON game_rankings(room_id, group_label, rank_position);

-- ============================================================
-- 8. 游戏事件日志（审计用）
-- ============================================================
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_room ON game_events(room_id, created_at);

-- ============================================================
-- 9. 自动更新时间戳触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON game_rooms;
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. RLS 策略
-- ============================================================
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_cheat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- 公开读取题库（仅激活的）
CREATE POLICY "questions_readable" ON game_questions
  FOR SELECT USING (is_active = true);

-- 房间：所有人可读（通过room_code加入）
CREATE POLICY "rooms_readable" ON game_rooms
  FOR SELECT USING (true);

-- 房间：认证用户可创建
CREATE POLICY "rooms_insertable" ON game_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 房间：host可更新
CREATE POLICY "rooms_updatable" ON game_rooms
  FOR UPDATE USING (host_user_id = auth.uid());

-- 玩家：同房间可读
CREATE POLICY "players_readable" ON game_players
  FOR SELECT USING (true);

-- 玩家：本人或host可更新
CREATE POLICY "players_updatable" ON game_players
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR room_id IN (SELECT id FROM game_rooms WHERE host_user_id = auth.uid())
  );

-- 玩家：认证用户可加入
CREATE POLICY "players_insertable" ON game_players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 回合：所有人可读
CREATE POLICY "rounds_readable" ON game_rounds
  FOR SELECT USING (true);

-- 答题记录：本人可读，host可读所有
CREATE POLICY "answers_readable" ON game_answers
  FOR SELECT USING (
    player_id IN (SELECT id FROM game_players WHERE auth_user_id = auth.uid())
    OR room_id IN (SELECT id FROM game_rooms WHERE host_user_id = auth.uid())
  );

-- 排名：所有人可读
CREATE POLICY "rankings_readable" ON game_rankings
  FOR SELECT USING (true);

-- 反作弊：host可读
CREATE POLICY "anticheat_readable" ON anti_cheat_logs
  FOR SELECT USING (
    room_id IN (SELECT id FROM game_rooms WHERE host_user_id = auth.uid())
  );

-- 事件：host可读
CREATE POLICY "events_readable" ON game_events
  FOR SELECT USING (
    room_id IN (SELECT id FROM game_rooms WHERE host_user_id = auth.uid())
  );

-- ============================================================
-- 11. 实时订阅（Realtime Channels）
-- ============================================================
-- 启用 realtime 发布
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_rankings;

-- ============================================================
-- 12. 辅助函数
-- ============================================================

-- 生成短房间码（6位大写字母+数字）
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 计算玩家在本回合的百分位排名
CREATE OR REPLACE FUNCTION calc_player_percentile(
  p_room_id UUID,
  p_player_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  player_score INTEGER;
  total_players INTEGER;
  players_below INTEGER;
BEGIN
  SELECT score INTO player_score FROM game_players
    WHERE id = p_player_id AND room_id = p_room_id;

  SELECT COUNT(*) INTO total_players FROM game_players
    WHERE room_id = p_room_id;

  SELECT COUNT(*) INTO players_below FROM game_players
    WHERE room_id = p_room_id AND score < player_score;

  IF total_players <= 1 THEN RETURN 100; END IF;
  RETURN ROUND((players_below::NUMERIC / (total_players - 1)::NUMERIC) * 100, 1);
END;
$$ LANGUAGE plpgsql;

-- 计算每题正确率
CREATE OR REPLACE FUNCTION calc_question_accuracy(
  p_round_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  total_answers INTEGER;
  correct_answers INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_answers FROM game_answers WHERE round_id = p_round_id;
  SELECT COUNT(*) INTO correct_answers FROM game_answers WHERE round_id = p_round_id AND is_correct = true;

  IF total_answers = 0 THEN RETURN 0; END IF;
  RETURN ROUND((correct_answers::NUMERIC / total_answers::NUMERIC) * 100, 1);
END;
$$ LANGUAGE plpgsql;
