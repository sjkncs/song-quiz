import Link from 'next/link'
import { IconBronze, IconSilver, IconGold, IconDiamond } from '@/components/Icons'

const RANK_ICON_MAP: Record<string, typeof IconBronze> = {
  '青铜听众': IconBronze, '白银乐迷': IconSilver, '黄金歌神': IconGold, '钻石音帝': IconDiamond,
}

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center min-h-screen px-6 py-16 relative overflow-hidden">
      {/* Floating background orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl" />

      {/* Hero Section */}
      <section className="relative z-10 text-center mb-20 slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 tracking-wide">2026 夏日音乐祭 · 第一赛季</span>
        </div>

        <h1 className="text-7xl md:text-8xl font-bold mb-6 tracking-tight">
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            猜歌王
          </span>
        </h1>
        <p className="text-xl text-slate-400 mb-3 font-light">听歌识曲，猜对有奖</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          播放旋律片段，从四个选项中猜出歌名。连击加分，段位晋升，分享你的音乐品味。
        </p>
      </section>

      {/* Mode Selection */}
      <section className="relative z-10 w-full max-w-5xl mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Classic Mode */}
          <Link href="/play?mode=classic" className="group">
            <div className="glass glass-hover rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-violet-500/15 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">经典模式</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  10 道题，4 选 1，不限时。适合休闲放松，慢慢品味旋律。
                </p>
                <div className="flex items-center gap-2 text-violet-400 text-sm font-medium group-hover:gap-3 transition-all">
                  开始挑战
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Timed Mode */}
          <Link href="/play?mode=timed" className="group">
            <div className="glass glass-hover rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-pink-500/15 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">限时挑战</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  每题 10 秒倒计时，速度与准确性的双重考验，追求极限刺激。
                </p>
                <div className="flex items-center gap-2 text-pink-400 text-sm font-medium group-hover:gap-3 transition-all">
                  限时开冲
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Theme Mode */}
          <Link href="/play?mode=theme" className="group">
            <div className="glass glass-hover rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/15 flex items-center justify-center mb-5">
                  <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">主题专场</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  周杰伦、抖音神曲、90 年代金曲……按主题精选，垂直乐迷的最爱。
                </p>
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium group-hover:gap-3 transition-all">
                  选择主题
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Rank System */}
      <section className="relative z-10 w-full max-w-3xl mb-20 slide-up slide-up-delay-2">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-white mb-2">段位系统</h2>
          <p className="text-sm text-slate-400">累计积分晋升，从青铜到钻石，见证你的音乐之旅</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '青铜听众', range: '0 – 999', tier: 'rank-bronze' },
            { label: '白银乐迷', range: '1k – 4,999', tier: 'rank-silver' },
            { label: '黄金歌神', range: '5k – 19,999', tier: 'rank-gold' },
            { label: '钻石音帝', range: '20,000+', tier: 'rank-diamond' },
          ].map((rank) => {
            const RankIcon = RANK_ICON_MAP[rank.label]
            return (
              <div key={rank.label} className="text-center group">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${rank.tier} mb-3 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {RankIcon && <RankIcon size={36} />}
                </div>
                <p className="text-sm font-medium text-white mb-1">{rank.label}</p>
                <p className="text-xs text-slate-500">{rank.range}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-auto pt-16 pb-8 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
          <Link href="/leaderboard" className="hover:text-violet-400 transition-colors">排行榜</Link>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <Link href="/login" className="hover:text-violet-400 transition-colors">登录</Link>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <Link href="/profile" className="hover:text-violet-400 transition-colors">个人中心</Link>
        </div>
        <p className="mt-4 text-xs text-slate-600">猜歌王 © 2026 · AI Coding 夏令营</p>
      </footer>
    </main>
  )
}
