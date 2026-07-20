'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RANK_CONFIG } from '@/lib/supabase'
import { getLeaderboard } from '@/app/actions'

type LBEntry = {
  rank: number
  nickname: string
  score: number
  games: number
  rankLevel: 'bronze' | 'silver' | 'gold' | 'diamond'
}

// Fallback demo data
const DEMO_DATA: LBEntry[] = [
  { rank: 1, nickname: '音浪猎人', score: 28500, games: 45, rankLevel: 'diamond' },
  { rank: 2, nickname: '旋律大师', score: 21300, games: 38, rankLevel: 'diamond' },
  { rank: 3, nickname: '猜歌达人', score: 15800, games: 32, rankLevel: 'gold' },
  { rank: 4, nickname: '乐迷小王', score: 12400, games: 28, rankLevel: 'gold' },
  { rank: 5, nickname: '新手上路', score: 8900, games: 22, rankLevel: 'gold' },
  { rank: 6, nickname: '音乐小白', score: 4500, games: 15, rankLevel: 'silver' },
  { rank: 7, nickname: '听歌识曲', score: 3200, games: 12, rankLevel: 'silver' },
  { rank: 8, nickname: '旋律猎手', score: 1800, games: 8, rankLevel: 'silver' },
  { rank: 9, nickname: '青铜一号', score: 650, games: 5, rankLevel: 'bronze' },
  { rank: 10, nickname: '刚来试试', score: 200, games: 2, rankLevel: 'bronze' },
]

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LBEntry[]>(DEMO_DATA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard('2026-summer', 50)
        if (data && data.length > 0) {
          const mapped: LBEntry[] = data.map((row: any, i: number) => ({
            rank: i + 1,
            nickname: row.profiles?.nickname || '匿名玩家',
            score: row.total_score || 0,
            games: row.games_played || 0,
            rankLevel: (row.rank_level as LBEntry['rankLevel']) || 'bronze',
          }))
          setEntries(mapped)
        }
      } catch {
        // Fallback to demo data
      }
      setLoading(false)
    }
    load()
  }, [])
  return (
    <main className="flex-1 flex flex-col items-center min-h-screen px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">全服排行榜</h1>
      <p className="text-gray-500 mb-8">2026夏日音乐祭 · 第一赛季</p>

      {/* Top 3 podium */}
      <div className="flex items-end justify-center gap-4 mb-12 max-w-md w-full">
        {[1, 0, 2].map((idx) => {
          const player = entries[idx]
          if (!player) return null
          const isFirst = idx === 0
          const rankConfig = RANK_CONFIG[player.rankLevel]
          return (
            <div key={idx} className="text-center flex-1">
              <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${rankConfig.gradient} flex items-center justify-center mb-2 ${isFirst ? 'glow-gold' : ''}`}>
                <span className="text-lg font-bold text-gray-900">{player.nickname[0]}</span>
              </div>
              <p className="text-sm text-white font-medium truncate">{player.nickname}</p>
              <p className="text-xs text-gray-500">{player.score.toLocaleString()}分</p>
              <div className={`mt-2 rounded-t-lg ${isFirst ? 'h-24 bg-yellow-500/20' : idx === 1 ? 'h-16 bg-gray-400/20' : 'h-12 bg-amber-700/20'} flex items-end justify-center pb-2`}>
                <span className="text-2xl font-bold text-gray-400">#{player.rank}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full list */}
      <div className="w-full max-w-lg">
        {entries.slice(3).map((player) => {
          const rankConfig = RANK_CONFIG[player.rankLevel]
          return (
            <div key={player.rank} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
              <span className="w-8 text-center text-gray-500 font-mono">#{player.rank}</span>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${rankConfig.gradient} flex items-center justify-center shrink-0`}>
                <span className="text-sm font-bold text-gray-900">{player.nickname[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{player.nickname}</p>
                <p className="text-xs text-gray-500">{player.games}局</p>
              </div>
              <span className="text-sm font-mono text-purple-400">{player.score.toLocaleString()}</span>
            </div>
          )
        })}
      </div>

      {/* Back */}
      <Link href="/" className="mt-12 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        ← 返回首页
      </Link>
    </main>
  )
}
