'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DEMO_SONGS, generateQuiz, createQuizState, submitAnswer, isQuizComplete, getQuizDuration, THEME_CONFIG } from '@/lib/game-logic'
import type { QuizState } from '@/lib/game-logic'
import { QuizCard } from '@/components/QuizCard'
import { ResultsScreen } from '@/components/ResultsScreen'
import { IconMic, IconMusic, IconFire, IconDisc, IconClock, IconLyrics } from '@/components/Icons'

const ICON_MAP: Record<string, React.FC<{ className?: string; size?: number }>> = {
  mic: IconMic, music: IconMusic, fire: IconFire,
  disc: IconDisc, clock: IconClock, lyrics: IconLyrics,
}

function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || IconMusic
  return <Icon size={20} className={className} />
}

type GameMode = 'classic' | 'timed' | 'theme'

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center min-h-screen"><p className="text-gray-400">加载中...</p></main>}>
      <PlayContent />
    </Suspense>
  )
}

function PlayContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = (searchParams.get('mode') || 'classic') as GameMode
  const themeParam = searchParams.get('theme')

  const [phase, setPhase] = useState<'theme-select' | 'playing' | 'results'>(
    mode === 'theme' && !themeParam ? 'theme-select' : 'playing'
  )
  const [quizState, setQuizState] = useState<QuizState | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(themeParam)

  // Initialize quiz
  useEffect(() => {
    if (phase !== 'playing') return

    let songs = DEMO_SONGS
    if (selectedTheme) {
      songs = DEMO_SONGS.filter(s => s.theme.includes(selectedTheme))
    }
    if (mode === 'timed') {
      songs = songs.sort(() => Math.random() - 0.5)
    }

    const questions = generateQuiz(songs, Math.min(10, songs.length))
    if (questions.length < 4) {
      router.push('/?error=not-enough-songs')
      return
    }
    setQuizState(createQuizState(questions))
  }, [phase, selectedTheme, mode, router])

  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme)
    setPhase('playing')
  }

  const handleAnswer = useCallback((optionIndex: number | null, timeTakenMs: number) => {
    if (!quizState) return
    const newState = submitAnswer(quizState, optionIndex, timeTakenMs)
    setQuizState(newState)

    if (isQuizComplete(newState)) {
      setPhase('results')
    }
  }, [quizState])

  const handleRestart = () => {
    setQuizState(null)
    if (mode === 'theme' && !themeParam) {
      setPhase('theme-select')
    } else {
      setPhase('playing')
    }
  }

  // Theme selection screen
  if (phase === 'theme-select') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="text-center mb-10 slide-up">
          <h1 className="text-3xl font-bold text-white mb-2">选择主题专场</h1>
          <p className="text-sm text-slate-400">挑选你擅长的音乐类型，开始挑战</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl w-full slide-up slide-up-delay-1">
          {Object.entries(THEME_CONFIG).map(([key, config]) => {
            const iconColors: Record<string, string> = {
              mic: 'text-pink-400', music: 'text-violet-400', fire: 'text-amber-400',
              disc: 'text-cyan-400', clock: 'text-emerald-400', lyrics: 'text-blue-400',
            }
            const iconBgs: Record<string, string> = {
              mic: 'bg-pink-500/15', music: 'bg-violet-500/15', fire: 'bg-amber-500/15',
              disc: 'bg-cyan-500/15', clock: 'bg-emerald-500/15', lyrics: 'bg-blue-500/15',
            }
            return (
              <button
                key={key}
                onClick={() => handleThemeSelect(key)}
                className="glass glass-hover btn-press rounded-2xl p-6 text-left"
              >
                <div className={`w-10 h-10 rounded-xl ${iconBgs[config.icon] || 'bg-white/5'} flex items-center justify-center mb-3`}>
                  <ThemeIcon name={config.icon} className={iconColors[config.icon] || 'text-white'} />
                </div>
                <h3 className="text-white font-semibold mb-1">{config.label}</h3>
                <p className="text-xs text-slate-500">
                  {DEMO_SONGS.filter(s => s.theme.includes(key)).length} 首曲目
                </p>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => router.push('/')}
          className="mt-10 text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首页
        </button>
      </main>
    )
  }

  // Results screen
  if (phase === 'results' && quizState) {
    return (
      <ResultsScreen
        state={quizState}
        mode={mode}
        theme={selectedTheme}
        duration={getQuizDuration(quizState)}
        onRestart={handleRestart}
      />
    )
  }

  // Playing screen
  if (phase === 'playing' && quizState) {
    const currentQuestion = quizState.questions[quizState.currentIndex]
    if (!currentQuestion) return null

    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-8">
        {/* Progress HUD */}
        <div className="w-full max-w-lg mb-10">
          <div className="glass rounded-xl px-5 py-3 flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">
              第 <span className="text-white font-semibold">{quizState.currentIndex + 1}</span>
              <span className="text-slate-600 mx-1">/</span>
              {quizState.questions.length} 题
            </span>
            <div className="flex items-center gap-5">
              {quizState.combo > 1 && (
                <span className="text-amber-400 font-bold text-sm score-pop flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                  {quizState.combo} 连击
                </span>
              )}
              <span className="text-violet-400 font-mono font-semibold text-sm tabular-nums">
                {quizState.totalScore.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full shimmer rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((quizState.currentIndex) / quizState.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz Card */}
        <QuizCard
          song={currentQuestion.song}
          options={currentQuestion.options}
          correctIndex={currentQuestion.correctIndex}
          mode={mode}
          onAnswer={handleAnswer}
        />

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="mt-10 text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          退出游戏
        </button>
      </main>
    )
  }

  return null
}
