import { Song, RANK_CONFIG, getRank } from './supabase'

// ─── Scoring ───
const BASE_SCORE = 100
const TIME_BONUS_PER_SEC = 10
const MAX_TIME_SEC = 10

export function calculateScore(isCorrect: boolean, timeRemainingSec: number, combo: number): number {
  if (!isCorrect) return 0
  const timeBonus = Math.max(0, timeRemainingSec) * TIME_BONUS_PER_SEC
  const comboMultiplier = Math.min(combo, 5) // cap at 5x
  return (BASE_SCORE + timeBonus) * comboMultiplier
}

// ─── Quiz Generation ───
export function generateQuestion(
  songs: Song[],
  usedSongIds: Set<string>
): { song: Song; options: string[]; correctIndex: number } | null {
  const available = songs.filter(s => !usedSongIds.has(s.id))
  if (available.length < 4) return null

  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const correctSong = shuffled[0]
  const distractors = shuffled.slice(1, 4)

  const allOptions = [correctSong, ...distractors].map(s => `${s.title} - ${s.artist}`)
  const options = allOptions.sort(() => Math.random() - 0.5)
  const correctIndex = options.indexOf(`${correctSong.title} - ${correctSong.artist}`)

  return { song: correctSong, options, correctIndex }
}

export function generateQuiz(
  songs: Song[],
  totalQuestions: number = 10
): { song: Song; options: string[]; correctIndex: number }[] {
  const questions: { song: Song; options: string[]; correctIndex: number }[] = []
  const usedIds = new Set<string>()

  for (let i = 0; i < totalQuestions; i++) {
    const q = generateQuestion(songs, usedIds)
    if (!q) break
    questions.push(q)
    usedIds.add(q.song.id)
  }

  return questions
}

// ─── Quiz State ───
export type QuizState = {
  questions: { song: Song; options: string[]; correctIndex: number }[]
  currentIndex: number
  answers: {
    songId: string
    selectedOption: number | null
    correctOption: number
    isCorrect: boolean
    timeTakenMs: number
    scoreEarned: number
    options: string[]
  }[]
  totalScore: number
  correctCount: number
  combo: number
  maxCombo: number
  startTime: number
}

export function createQuizState(questions: { song: Song; options: string[]; correctIndex: number }[]): QuizState {
  return {
    questions,
    currentIndex: 0,
    answers: [],
    totalScore: 0,
    correctCount: 0,
    combo: 0,
    maxCombo: 0,
    startTime: Date.now(),
  }
}

export function submitAnswer(
  state: QuizState,
  selectedOption: number | null,
  timeTakenMs: number
): QuizState {
  const question = state.questions[state.currentIndex]
  if (!question) return state

  const isCorrect = selectedOption === question.correctIndex
  const newCombo = isCorrect ? state.combo + 1 : 0
  const timeRemaining = Math.max(0, MAX_TIME_SEC - timeTakenMs / 1000)
  const scoreEarned = calculateScore(isCorrect, timeRemaining, newCombo)

  const answer = {
    songId: question.song.id,
    selectedOption,
    correctOption: question.correctIndex,
    isCorrect,
    timeTakenMs,
    scoreEarned,
    options: question.options,
  }

  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    answers: [...state.answers, answer],
    totalScore: state.totalScore + scoreEarned,
    correctCount: state.correctCount + (isCorrect ? 1 : 0),
    combo: newCombo,
    maxCombo: Math.max(state.maxCombo, newCombo),
  }
}

export function isQuizComplete(state: QuizState): boolean {
  return state.currentIndex >= state.questions.length
}

export function getQuizDuration(state: QuizState): number {
  return Math.round((Date.now() - state.startTime) / 1000)
}

// ─── Difficulty Config ───
export const DIFFICULTY_CONFIG = {
  beginner: { label: '新手', audioDuration: 30, color: '#03DAC6' },
  intermediate: { label: '进阶', audioDuration: 30, color: '#BB86FC' },
  expert: { label: '地狱', audioDuration: 30, color: '#FF4580' },
} as const

// ─── Theme Config ───
export const THEME_CONFIG = {
  beyond: { label: 'Beyond 专场', icon: 'fire' },
  eason: { label: '陈奕迅专场', icon: 'mic' },
  faye: { label: '王菲专场', icon: 'disc' },
  classic: { label: '粤语经典', icon: 'music' },
  new_gen: { label: '新生港乐', icon: 'clock' },
  rock: { label: '港式摇滚', icon: 'lyrics' },
} as const

// ─── Song Library (42首粤语港乐 — from cantopop-library.ts) ───
export { default as DEMO_SONGS } from './cantopop-library'
