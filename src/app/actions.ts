'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Song, QuizAnswer } from '@/lib/supabase'

// ─── Auth Actions ───

export async function signInWithEmail(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/play` }
  })
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function signInWithOAuth(provider: 'github' | 'google') {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/play` }
  })
  if (error) throw new Error(error.message)
  return { url: data.url }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) return null
  return data
}

// ─── Song Actions ───

export async function getSongs(options?: {
  difficulty?: string
  theme?: string
  limit?: number
}): Promise<Song[]> {
  const supabase = await createClient()
  let query = supabase
    .from('songs')
    .select('*')
    .eq('is_active', true)

  if (options?.difficulty) {
    query = query.eq('difficulty', options.difficulty)
  }
  if (options?.theme) {
    query = query.contains('theme', [options.theme])
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(50)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as Song[]
}

// ─── Quiz Actions ───

export async function saveQuizResult(params: {
  mode: string
  theme?: string
  totalQuestions: number
  correctCount: number
  totalScore: number
  maxCombo: number
  durationSec: number
  answers: Omit<QuizAnswer, 'id'>[]
}): Promise<{ quizId: string; newRank: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get current rank before
  const { data: profile } = await supabase
    .from('profiles')
    .select('rank_level, total_score')
    .eq('id', user.id)
    .single()

  const rankBefore = profile?.rank_level || 'bronze'

  // Insert quiz record
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      user_id: user.id,
      mode: params.mode,
      theme: params.theme,
      total_questions: params.totalQuestions,
      correct_count: params.correctCount,
      total_score: params.totalScore,
      max_combo: params.maxCombo,
      duration_sec: params.durationSec,
      rank_before: rankBefore,
    })
    .select('id')
    .single()

  if (quizError || !quiz) {
    console.error('Failed to save quiz:', quizError)
    return null
  }

  // Insert answer records
  if (params.answers.length > 0) {
    const answerRows = params.answers.map((a, i) => ({
      quiz_id: quiz.id,
      song_id: a.song_id,
      question_index: i,
      selected_option: a.selected_option,
      correct_option: a.correct_option,
      is_correct: a.is_correct,
      time_taken_ms: a.time_taken_ms,
      score_earned: a.score_earned,
      options: a.options,
    }))

    const { error: answerError } = await supabase
      .from('quiz_answers')
      .insert(answerRows)

    if (answerError) {
      console.error('Failed to save answers:', answerError)
    }
  }

  // Get updated rank (trigger should have updated it)
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('rank_level')
    .eq('id', user.id)
    .single()

  revalidatePath('/leaderboard')
  revalidatePath('/profile')

  return {
    quizId: quiz.id,
    newRank: updatedProfile?.rank_level || rankBefore,
  }
}

// ─── Leaderboard Actions ───

export async function getLeaderboard(season: string = '2026-summer', limit: number = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leaderboard')
    .select(`
      user_id,
      total_score,
      games_played,
      best_score,
      rank_level,
      profiles:profiles (
        nickname,
        avatar_url
      )
    `)
    .eq('season', season)
    .order('total_score', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}

export async function getMyRank(season: string = '2026-summer') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('leaderboard')
    .select('total_score, rank_level, games_played, best_score')
    .eq('user_id', user.id)
    .eq('season', season)
    .single()

  if (error || !data) return null
  return data
}

// ─── Profile Actions ───

export async function updateProfile(params: { nickname?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update(params)
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/leaderboard')
}

// ─── Stats Actions ───

export async function getUserStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('total_score, correct_count, total_questions, mode, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(100)

  if (!quizzes) return null

  const totalGames = quizzes.length
  const totalScore = quizzes.reduce((s, q) => s + q.total_score, 0)
  const avgAccuracy = totalGames > 0
    ? Math.round(quizzes.reduce((s, q) => s + (q.correct_count / q.total_questions), 0) / totalGames * 100)
    : 0
  const bestScore = Math.max(0, ...quizzes.map(q => q.total_score))

  return { totalGames, totalScore, avgAccuracy, bestScore, recentQuizzes: quizzes.slice(0, 10) }
}
