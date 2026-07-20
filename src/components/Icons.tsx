// SVG Icon Library — replaces all emoji usage across the app

type IconProps = {
  className?: string
  size?: number
}

// ═══ Navigation / UI ═══

export function IconMusic({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

export function IconClock({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function IconMic({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

export function IconPlay({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

export function IconPause({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function IconReplay({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

export function IconArrowRight({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function IconArrowLeft({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function IconCheck({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function IconX({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function IconShare({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export function IconDownload({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ═══ Rank Badges (SVG medal/trophy/crown/diamond) ═══

export function IconBronze({ className = '', size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="20" r="14" fill="#CD7F32" opacity={0.2} />
      <circle cx="24" cy="20" r="11" stroke="#CD7F32" strokeWidth={2.5} fill="none" />
      <circle cx="24" cy="20" r="6" fill="#CD7F32" opacity={0.6} />
      <path d="M16 32l8 12 8-12" stroke="#CD7F32" strokeWidth={2} fill="#CD7F32" opacity={0.15} />
      <text x="24" y="24" textAnchor="middle" fill="#CD7F32" fontSize="10" fontWeight="bold" fontFamily="system-ui">B</text>
    </svg>
  )
}

export function IconSilver({ className = '', size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="20" r="14" fill="#C0C0C0" opacity={0.2} />
      <circle cx="24" cy="20" r="11" stroke="#C0C0C0" strokeWidth={2.5} fill="none" />
      <circle cx="24" cy="20" r="6" fill="#C0C0C0" opacity={0.6} />
      <path d="M16 32l8 12 8-12" stroke="#C0C0C0" strokeWidth={2} fill="#C0C0C0" opacity={0.15} />
      <text x="24" y="24" textAnchor="middle" fill="#888" fontSize="10" fontWeight="bold" fontFamily="system-ui">S</text>
    </svg>
  )
}

export function IconGold({ className = '', size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="20" r="14" fill="#FFD700" opacity={0.15} />
      <circle cx="24" cy="20" r="11" stroke="#FFD700" strokeWidth={2.5} fill="none" />
      <path d="M24 10l2.5 5.5H32l-4.5 3.5 1.7 5.5L24 21l-5.2 3.5 1.7-5.5L16 15.5h5.5z" fill="#FFD700" opacity={0.8} />
      <path d="M16 32l8 12 8-12" stroke="#FFD700" strokeWidth={2} fill="#FFD700" opacity={0.1} />
    </svg>
  )
}

export function IconDiamond({ className = '', size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <polygon points="24,4 40,18 24,44 8,18" fill="url(#diamondGrad)" opacity={0.2} stroke="url(#diamondGrad)" strokeWidth={2} />
      <polygon points="24,10 34,18 24,38 14,18" fill="url(#diamondGrad)" opacity={0.4} />
      <line x1="8" y1="18" x2="40" y2="18" stroke="url(#diamondGrad)" strokeWidth={1.5} opacity={0.6} />
      <line x1="24" y1="4" x2="14" y2="18" stroke="url(#diamondGrad)" strokeWidth={1} opacity={0.4} />
      <line x1="24" y1="4" x2="34" y2="18" stroke="url(#diamondGrad)" strokeWidth={1} opacity={0.4} />
    </svg>
  )
}

// ═══ Fire / Combo ═══

export function IconFire({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
    </svg>
  )
}

// ═══ Trophy ═══

export function IconTrophy({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

// ═══ User ═══

export function IconUser({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ═══ Leaderboard ═══

export function IconLeaderboard({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="3" width="4" height="18" rx="1" />
      <rect x="17" y="8" width="4" height="13" rx="1" />
    </svg>
  )
}

// ═══ Lyrics (for background rendering) ═══

export function IconLyrics({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

// ═══ Disc / Album ═══

export function IconDisc({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
