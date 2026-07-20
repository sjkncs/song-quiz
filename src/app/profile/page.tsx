'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getUserStats, updateProfile, signOut } from '@/app/actions'
import { getRank, RANK_CONFIG } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, s] = await Promise.all([getProfile(), getUserStats()])
      setProfile(p)
      setStats(s)
      if (p?.nickname) setNickname(p.nickname)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!nickname.trim()) return
    await updateProfile({ nickname: nickname.trim() })
    setEditing(false)
    const p = await getProfile()
    setProfile(p)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-gray-400">加载中...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-gray-400 mb-4">请先登录</p>
        <button onClick={() => router.push('/login')} className="px-6 py-2 rounded-xl bg-purple-500 text-white">
          去登录
        </button>
      </main>
    )
  }

  const rank = getRank(profile.total_score)
  const rankConfig = RANK_CONFIG[rank]

  return (
    <main className="flex-1 flex flex-col items-center min-h-screen px-6 py-12">
      {/* Avatar + Nickname */}
      <div className="text-center mb-8">
        <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${rankConfig.gradient} flex items-center justify-center mb-4 glow-gold`}>
          <span className="text-3xl font-bold text-gray-900">{rankConfig.label[0]}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-2 justify-center">
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={16}
              className="px-3 py-1 rounded-lg bg-white/5 border border-white/20 text-white text-center text-lg focus:outline-none focus:border-purple-400"
            />
            <button onClick={handleSave} className="text-teal-400 text-sm">保存</button>
            <button onClick={() => { setEditing(false); setNickname(profile.nickname) }} className="text-gray-500 text-sm">取消</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-2xl font-bold text-white">{profile.nickname}</h1>
            <button onClick={() => setEditing(true)} className="text-gray-500 text-sm hover:text-gray-300">编辑</button>
          </div>
        )}
        <p className="text-sm mt-1" style={{ color: rankConfig.color }}>{rankConfig.label}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg w-full mb-8">
          <StatCard label="总局数" value={`${stats.totalGames}`} color="text-purple-400" />
          <StatCard label="总分" value={stats.totalScore.toLocaleString()} color="text-teal-400" />
          <StatCard label="平均正确率" value={`${stats.avgAccuracy}%`} color="text-yellow-400" />
          <StatCard label="最高单局" value={stats.bestScore.toLocaleString()} color="text-pink-400" />
        </div>
      )}

      {/* Progress to next rank */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{rankConfig.label}</span>
          <span>{profile.total_score.toLocaleString()} / {rankConfig.max === Infinity ? '∞' : rankConfig.max.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${rankConfig.gradient} rounded-full transition-all`}
            style={{ width: `${Math.min(100, ((profile.total_score - rankConfig.min) / (rankConfig.max - rankConfig.min)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Recent Games */}
      {stats?.recentQuizzes && stats.recentQuizzes.length > 0 && (
        <div className="w-full max-w-lg mb-8">
          <h3 className="text-sm text-gray-500 mb-3 uppercase tracking-wider">最近对局</h3>
          <div className="space-y-2">
            {stats.recentQuizzes.map((q: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-xs text-gray-500 w-16">{q.mode}</span>
                <span className="flex-1 text-sm text-gray-300">
                  {q.correct_count}/{q.total_questions} 题
                </span>
                <span className="text-sm font-mono text-purple-400">{q.total_score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-4">
        <button onClick={() => router.push('/play?mode=classic')} className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-teal-400 text-white font-bold">
          开始游戏
        </button>
        <button onClick={handleSignOut} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
          退出登录
        </button>
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
