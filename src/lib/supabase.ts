import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type Song = {
  id: string
  title: string
  artist: string
  album?: string
  year?: number
  genre: string
  difficulty: 'beginner' | 'intermediate' | 'expert'
  audio_url: string
  audio_duration_sec: number
  cover_url?: string
  cover_gradient?: [string, string]
  artwork_url?: string
  video_url?: string
  composer?: string
  lyricist?: string
  lyrics?: string
  theme: string[]
}

export type Quiz = {
  id: string
  user_id: string
  mode: 'classic' | 'timed' | 'theme'
  theme?: string
  total_questions: number
  correct_count: number
  total_score: number
  max_combo: number
  duration_sec?: number
  rank_before?: string
  rank_after?: string
  completed_at: string
}

export type QuizAnswer = {
  quiz_id: string
  song_id: string
  question_index: number
  selected_option: number | null
  correct_option: number
  is_correct: boolean
  time_taken_ms: number
  score_earned: number
  options: string[]
}

export type Profile = {
  id: string
  nickname: string
  avatar_url?: string
  total_score: number
  games_played: number
  rank_level: 'bronze' | 'silver' | 'gold' | 'diamond'
}

export type LeaderboardEntry = {
  user_id: string
  total_score: number
  games_played: number
  best_score: number
  rank_level: string
  profiles: {
    nickname: string
    avatar_url?: string
  }
}

export const RANK_CONFIG = {
  bronze: { label: '青铜听众', min: 0, max: 999, color: '#CD7F32', gradient: 'from-amber-700 to-amber-500' },
  silver: { label: '白银乐迷', min: 1000, max: 4999, color: '#C0C0C0', gradient: 'from-gray-300 to-gray-100' },
  gold: { label: '黄金歌神', min: 5000, max: 19999, color: '#FFD700', gradient: 'from-yellow-400 to-amber-300' },
  diamond: { label: '钻石音帝', min: 20000, max: Infinity, color: '#B9F2FF', gradient: 'from-cyan-300 via-purple-300 to-pink-300' },
} as const

export function getRank(score: number): keyof typeof RANK_CONFIG {
  if (score >= 20000) return 'diamond'
  if (score >= 5000) return 'gold'
  if (score >= 1000) return 'silver'
  return 'bronze'
}
