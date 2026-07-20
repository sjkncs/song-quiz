-- 猜歌王 Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null default '音乐小白',
  avatar_url text,
  total_score integer not null default 0,
  games_played integer not null default 0,
  rank_level text not null default 'bronze',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Songs table
create table public.songs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  artist text not null,
  album text,
  year integer,
  genre text not null default 'pop',
  difficulty text not null default 'beginner', -- beginner/intermediate/expert
  audio_url text not null,
  audio_duration_sec integer not null default 15,
  cover_url text,
  theme text[] default '{}', -- e.g. ['jay_chou', 'tiktok', '90s']
  is_active boolean not null default true,
  play_count integer not null default 0,
  correct_rate numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;
create policy "Songs are viewable by everyone"
  on public.songs for select using (is_active = true);

-- Quizzes (one game session)
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  mode text not null default 'classic', -- classic/timed/theme
  theme text,
  total_questions integer not null default 10,
  correct_count integer not null default 0,
  total_score integer not null default 0,
  max_combo integer not null default 0,
  duration_sec integer,
  rank_before text,
  rank_after text,
  completed_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;
create policy "Users can view own quizzes"
  on public.quizzes for select using (auth.uid() = user_id);
create policy "Users can insert own quizzes"
  on public.quizzes for insert with check (auth.uid() = user_id);

-- Quiz answers (per-question detail)
create table public.quiz_answers (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  song_id uuid references public.songs(id) not null,
  question_index integer not null,
  selected_option integer,
  correct_option integer not null,
  is_correct boolean not null,
  time_taken_ms integer,
  score_earned integer not null default 0,
  options jsonb not null -- array of 4 option strings
);

alter table public.quiz_answers enable row level security;
create policy "Users can view own answers"
  on public.quiz_answers for select
  using (exists (select 1 from public.quizzes where id = quiz_id and user_id = auth.uid()));
create policy "Users can insert own answers"
  on public.quiz_answers for insert with check (
    exists (select 1 from public.quizzes where id = quiz_id and user_id = auth.uid())
  );

-- Leaderboard (materialized for fast reads)
create table public.leaderboard (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  season text not null default '2026-summer',
  total_score integer not null default 0,
  games_played integer not null default 0,
  best_score integer not null default 0,
  rank_level text not null default 'bronze',
  percentile numeric(5,2),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;
create policy "Leaderboard is viewable by everyone"
  on public.leaderboard for select using (true);

-- Indexes for performance
create index idx_songs_difficulty on public.songs(difficulty);
create index idx_songs_theme on public.songs using gin(theme);
create index idx_quizzes_user on public.quizzes(user_id);
create index idx_quizzes_completed on public.quizzes(completed_at desc);
create index idx_leaderboard_score on public.leaderboard(total_score desc);
create index idx_leaderboard_season on public.leaderboard(season, total_score desc);

-- Function: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', '音乐小白'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  insert into public.leaderboard (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function: update profile score after quiz
create or replace function public.update_profile_after_quiz()
returns trigger as $$
begin
  update public.profiles
  set
    total_score = total_score + new.total_score,
    games_played = games_played + 1,
    rank_level = case
      when total_score + new.total_score >= 20000 then 'diamond'
      when total_score + new.total_score >= 5000 then 'gold'
      when total_score + new.total_score >= 1000 then 'silver'
      else 'bronze'
    end,
    updated_at = now()
  where id = new.user_id;

  -- Update leaderboard
  insert into public.leaderboard (user_id, total_score, games_played, best_score, rank_level)
  values (new.user_id, new.total_score, 1, new.total_score,
    case
      when new.total_score >= 20000 then 'diamond'
      when new.total_score >= 5000 then 'gold'
      when new.total_score >= 1000 then 'silver'
      else 'bronze'
    end)
  on conflict (user_id) do update set
    total_score = public.leaderboard.total_score + new.total_score,
    games_played = public.leaderboard.games_played + 1,
    best_score = greatest(public.leaderboard.best_score, new.total_score),
    rank_level = case
      when public.leaderboard.total_score + new.total_score >= 20000 then 'diamond'
      when public.leaderboard.total_score + new.total_score >= 5000 then 'gold'
      when public.leaderboard.total_score + new.total_score >= 1000 then 'silver'
      else 'bronze'
    end,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

create trigger on_quiz_completed
  after insert on public.quizzes
  for each row execute procedure public.update_profile_after_quiz();
