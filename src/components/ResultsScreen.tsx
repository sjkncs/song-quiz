'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { QuizState } from '@/lib/game-logic'
import { getRank, RANK_CONFIG } from '@/lib/supabase'
import { IconBronze, IconSilver, IconGold, IconDiamond } from '@/components/Icons'

const RANK_ICONS: Record<string, typeof IconBronze> = {
  bronze: IconBronze, silver: IconSilver, gold: IconGold, diamond: IconDiamond,
}

type Props = {
  state: QuizState
  mode: string
  theme: string | null
  duration: number
  onRestart: () => void
}

function generateShareCard(state: QuizState, rank: string, accuracy: number, duration: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 600; canvas.height = 400
  const ctx = canvas.getContext('2d')!
  const rc = RANK_CONFIG[rank as keyof typeof RANK_CONFIG]

  // Background
  const grad = ctx.createLinearGradient(0, 0, 600, 400)
  grad.addColorStop(0, '#14141f'); grad.addColorStop(1, '#1a0a2e')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 600, 400)

  // Title
  ctx.fillStyle = '#BB86FC'; ctx.font = 'bold 28px sans-serif'
  ctx.fillText('脑力派对', 30, 50)
  ctx.fillStyle = '#888'; ctx.font = '14px sans-serif'
  ctx.fillText('音乐影视知识对战', 30, 75)

  // Score
  ctx.fillStyle = '#fff'; ctx.font = 'bold 56px sans-serif'
  ctx.fillText(state.totalScore.toLocaleString(), 30, 160)
  ctx.fillStyle = '#aaa'; ctx.font = '16px sans-serif'
  ctx.fillText('总分', 30, 185)

  // Rank badge
  ctx.fillStyle = rc.color; ctx.font = 'bold 20px sans-serif'
  ctx.fillText(rc.label, 30, 230)

  // Stats
  const stats = [
    { label: '正确率', value: `${accuracy}%` },
    { label: '答对', value: `${state.correctCount}/${state.questions.length}` },
    { label: '连击', value: `${state.maxCombo}x` },
    { label: '用时', value: `${duration}秒` },
  ]
  stats.forEach((s, i) => {
    const x = 30 + i * 140
    ctx.fillStyle = '#BB86FC'; ctx.font = 'bold 22px sans-serif'
    ctx.fillText(s.value, x, 290)
    ctx.fillStyle = '#888'; ctx.font = '12px sans-serif'
    ctx.fillText(s.label, x, 310)
  })

  // Footer
  ctx.fillStyle = '#555'; ctx.font = '12px sans-serif'
  ctx.fillText('脑力派对 © 2026 · AI Coding 夏令营', 30, 375)
  ctx.fillText('来挑战我的成绩！', 430, 375)

  return canvas.toDataURL('image/png')
}

export function ResultsScreen({ state, mode, theme, duration, onRestart }: Props) {
  const router = useRouter()
  const rank = getRank(state.totalScore)
  const rankConfig = RANK_CONFIG[rank]
  const accuracy = state.questions.length > 0
    ? Math.round((state.correctCount / state.questions.length) * 100)
    : 0
  const [showShare, setShowShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleShare = useCallback(() => {
    const dataUrl = generateShareCard(state, rank, accuracy, duration)
    setShareUrl(dataUrl)
    setShowShare(true)
  }, [state, rank, accuracy, duration])

  const handleDownload = useCallback(() => {
    if (!shareUrl) return
    const a = document.createElement('a')
    a.href = shareUrl
    a.download = `脑力派对-成绩-${state.totalScore}分.png`
    a.click()
  }, [shareUrl, state.totalScore])

  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      {/* Rank Badge */}
      <div className="relative mb-10 slide-up">
        <div className={`w-32 h-32 rounded-3xl rank-${rank} flex items-center justify-center shadow-2xl ${rank === 'diamond' ? 'glow-violet' : rank === 'gold' ? 'glow-gold' : ''}`}>
          {(() => { const RankIcon = RANK_ICONS[rank]; return RankIcon ? <RankIcon size={64} /> : null })()}
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full glass text-xs text-slate-300 whitespace-nowrap font-medium">
          {rankConfig.label}
        </div>
      </div>

      {/* Score */}
      <div className="text-center mb-10 slide-up slide-up-delay-1">
        <h1 className="text-6xl font-bold text-white mb-2 score-pop tabular-nums">
          {state.totalScore.toLocaleString()}
        </h1>
        <p className="text-slate-400 text-sm">总分</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg w-full mb-10 slide-up slide-up-delay-2">
        <StatCard label="正确率" value={`${accuracy}%`} color="text-emerald-400" />
        <StatCard label="答对题数" value={`${state.correctCount}/${state.questions.length}`} color="text-violet-400" />
        <StatCard label="最高连击" value={`${state.maxCombo}x`} color="text-amber-400" />
        <StatCard label="用时" value={`${duration}秒`} color="text-pink-400" />
      </div>

      {/* Answer Review */}
      <div className="w-full max-w-lg mb-10 slide-up slide-up-delay-3">
        <h3 className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-medium">答题回顾</h3>
        <div className="space-y-2">
          {state.answers.map((answer, i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
              answer.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
            }`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                answer.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {answer.isCorrect ? '✓' : '✗'}
              </span>
              <span className="text-sm text-slate-300 flex-1 truncate">
                {answer.options[answer.correctOption]}
              </span>
              <span className={`text-xs font-mono font-medium ${answer.scoreEarned > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                +{answer.scoreEarned}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 slide-up slide-up-delay-3">
        <button
          onClick={handleShare}
          className="px-7 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold btn-press shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-shadow"
        >
          分享成绩
        </button>
        <button
          onClick={onRestart}
          className="px-7 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold btn-press shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-shadow"
        >
          再来一局
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-7 py-3 rounded-xl glass glass-hover text-slate-300 font-medium"
        >
          返回首页
        </button>
      </div>

      {/* Share Modal */}
      {showShare && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setShowShare(false)}>
          <div className="glass rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-4">分享成绩卡片</h3>
            <img src={shareUrl} alt="成绩卡片" className="w-full rounded-xl mb-4 border border-white/10" />
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium btn-press"
              >
                保存图片
              </button>
              <button
                onClick={() => setShowShare(false)}
                className="flex-1 px-4 py-2.5 rounded-xl glass glass-hover text-slate-300 font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1 font-medium">{label}</p>
    </div>
  )
}
