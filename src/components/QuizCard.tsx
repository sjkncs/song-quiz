'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { DIFFICULTY_CONFIG } from '@/lib/game-logic'
import type { Song } from '@/lib/supabase'

type Props = {
  song: Song
  options: string[]
  correctIndex: number
  mode: 'classic' | 'timed' | 'theme'
  onAnswer: (optionIndex: number | null, timeTakenMs: number) => void
}

const TIMED_SECONDS = 10

// Generate short beep sounds using Web Audio API
function playCorrectSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(523, ctx.currentTime) // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1) // E5
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2) // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

function playWrongSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

export function QuizCard({ song, options, correctIndex, mode, onAnswer }: Props) {
  const [phase, setPhase] = useState<'playing' | 'revealing' | 'done'>('playing')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(mode === 'timed' ? TIMED_SECONDS : 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const startTimeRef = useRef(Date.now())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Reset all state when song changes (new question)
  useEffect(() => {
    setPhase('playing')
    setSelectedOption(null)
    setTimeLeft(mode === 'timed' ? TIMED_SECONDS : 0)
    setIsPlaying(false)
    setHasPlayed(false)
    setCurrentTime(0)
    startTimeRef.current = Date.now()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [song.id, mode])

  // Parse lyrics into lines for smart subtitle display
  const lyricsLines = song.lyrics
    ? song.lyrics.split('\n').filter(line => line.trim().length > 0)
    : []

  // Weighted timing: longer lines get proportionally more time
  const totalChars = lyricsLines.reduce((sum, line) => sum + line.length, 0)
  const lineTimings = lyricsLines.map(line =>
    totalChars > 0 ? (line.length / totalChars) * song.audio_duration_sec : 0
  )
  // Cumulative start times for each line
  const lineStartTimes: number[] = []
  let cumulative = 0
  for (const duration of lineTimings) {
    lineStartTimes.push(cumulative)
    cumulative += duration
  }

  // Determine current lyric line based on cumulative timings
  const currentLyricIndex = (() => {
    if (lyricsLines.length === 0) return -1
    for (let i = lineStartTimes.length - 1; i >= 0; i--) {
      if (currentTime >= lineStartTimes[i]) return i
    }
    return 0
  })()

  // Timer for timed mode
  useEffect(() => {
    if (mode !== 'timed' || phase !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [mode, phase])

  const handleTimeout = useCallback(() => {
    if (phase !== 'playing') return
    const timeTaken = Date.now() - startTimeRef.current
    setPhase('revealing')
    setSelectedOption(null)
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false) }
    playWrongSound()
    setTimeout(() => {
      onAnswer(null, timeTaken)
    }, 1500)
  }, [phase, onAnswer])

  const handleSelect = (index: number) => {
    if (phase !== 'playing') return
    const timeTaken = Date.now() - startTimeRef.current
    setSelectedOption(index)
    setPhase('revealing')
    // Stop audio and play feedback sound
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false) }
    if (index === correctIndex) playCorrectSound()
    else playWrongSound()
    setTimeout(() => {
      onAnswer(index, timeTaken)
    }, 1500)
  }

  const getOptionStyle = (index: number) => {
    if (phase === 'playing') {
      return 'glass glass-hover btn-press'
    }
    if (index === correctIndex) {
      return 'option-correct'
    }
    if (index === selectedOption && index !== correctIndex) {
      return 'option-wrong'
    }
    return 'option-dimmed'
  }

  return (
    <div className="w-full max-w-lg slide-up">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={song.audio_url}
        onPlay={() => { setIsPlaying(true); setHasPlayed(true) }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        preload="auto"
      />

      {/* Audio Player Section */}
      <div className="glass rounded-2xl p-8 mb-8 flex flex-col items-center relative">
        <div className="flex items-end gap-1.5 h-24 mb-6">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="waveform-bar w-2 transition-all"
              style={{
                height: isPlaying ? undefined : '12%',
                animationPlayState: isPlaying ? 'running' : 'paused',
                opacity: isPlaying ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Smart Lyrics Subtitle — synced to audio playback */}
        {lyricsLines.length > 0 && phase === 'playing' && hasPlayed && (
          <div className="w-full mb-4 min-h-[60px] flex flex-col items-center justify-center">
            {lyricsLines.map((line, i) => {
              const isActive = i === currentLyricIndex && isPlaying
              const isPast = i < currentLyricIndex
              return (
                <p
                  key={i}
                  className={`text-center transition-all duration-500 leading-relaxed ${
                    isActive
                      ? 'text-white text-base font-medium scale-105 opacity-100'
                      : isPast
                        ? 'text-slate-500 text-sm opacity-40 line-through'
                        : 'text-slate-600 text-sm opacity-20'
                  }`}
                  style={{
                    display: Math.abs(i - currentLyricIndex) <= 1 ? 'block' : 'none',
                  }}
                >
                  {isActive && <span className="inline-block w-1 h-4 bg-violet-400 rounded-full mr-2 animate-pulse align-middle" />}
                  {line}
                </p>
              )
            })}
          </div>
        )}

        {phase === 'playing' && (
          <button
            onClick={() => {
              if (audioRef.current) {
                if (isPlaying) { audioRef.current.pause() }
                else { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}) }
              }
            }}
            className={`relative px-8 py-3 rounded-full text-sm font-medium btn-press transition-all ${
              isPlaying
                ? 'bg-violet-500/20 border border-violet-400/40 text-violet-300 glow-violet'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:border-violet-400/30'
            }`}
          >
            {isPlaying ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                播放中…
              </span>
            ) : hasPlayed ? '再听一次' : '播放旋律'}
          </button>
        )}
        {phase === 'revealing' && (
          <div className="w-full slide-up">
            {/* Cover art + Song info */}
            <div className="flex items-center gap-4 mb-2">
              {/* Album cover */}
              <div
                className="w-16 h-16 rounded-xl shrink-0 overflow-hidden shadow-lg"
                style={{
                  background: song.cover_gradient
                    ? `linear-gradient(135deg, ${song.cover_gradient[0]}, ${song.cover_gradient[1]})`
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                }}
              >
                {song.artwork_url ? (
                  <img
                    src={song.artwork_url}
                    alt={`${song.title} album cover`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white truncate">{song.title}</p>
                <p className="text-sm text-slate-400">{song.artist}{song.year ? ` · ${song.year}` : ''}</p>
                {(song.composer || song.lyricist) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {song.composer && `作曲: ${song.composer}`}
                    {song.composer && song.lyricist && ' · '}
                    {song.lyricist && `作词: ${song.lyricist}`}
                  </p>
                )}
              </div>
            </div>
            {/* Lyrics snippet */}
            {song.lyrics && (
              <div className="mt-3 px-4 py-3 rounded-lg bg-white/3 border-l-2 border-violet-400/40">
                <p className="text-xs text-slate-400 italic leading-relaxed whitespace-pre-line line-clamp-3">{song.lyrics}</p>
              </div>
            )}
            {/* Video section — direct embed or search link */}
            {song.video_url && (() => {
              const isEmbed = song.video_url.includes('/embed/')
              if (isEmbed) {
                return (
                  <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                    <iframe
                      src={`${song.video_url}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                      title={`${song.title} - ${song.artist} 演唱视频`}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              }
              // Search URL — show a styled button to open on YouTube
              return (
                <a
                  href={song.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-red-400/40 hover:bg-white/8 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium group-hover:text-red-300 transition-colors">
                      在 YouTube 观看 {song.title} MV
                    </p>
                    <p className="text-xs text-slate-500">{song.artist} · 点击新窗口打开</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-500 group-hover:text-red-300 ml-auto shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )
            })()}
          </div>
        )}
      </div>

      {/* Timer (timed mode) */}
      {mode === 'timed' && (
        <div className="flex justify-center mb-6">
          <div className={`text-5xl font-mono font-bold tabular-nums transition-colors ${
            timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-white'
          }`}>
            {String(timeLeft).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Difficulty badge */}
      <div className="flex justify-center mb-6">
        <span
          className="px-4 py-1.5 rounded-full text-xs font-medium border"
          style={{
            backgroundColor: `${DIFFICULTY_CONFIG[song.difficulty].color}15`,
            borderColor: `${DIFFICULTY_CONFIG[song.difficulty].color}30`,
            color: DIFFICULTY_CONFIG[song.difficulty].color,
          }}
        >
          {DIFFICULTY_CONFIG[song.difficulty].label} · {song.audio_duration_sec}秒
        </span>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={phase !== 'playing'}
            className={`p-5 rounded-xl border text-left transition-all duration-300 ${getOptionStyle(index)}`}
          >
            <div className="flex items-center gap-4">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                phase === 'playing' ? 'bg-white/5 text-slate-400' :
                index === correctIndex ? 'bg-emerald-500/20 text-emerald-300' :
                index === selectedOption ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-slate-600'
              }`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className={`text-sm font-medium ${
                phase === 'playing' ? 'text-slate-200' :
                index === correctIndex ? 'text-emerald-200' :
                index === selectedOption ? 'text-red-200' : 'text-slate-500'
              }`}>{option}</span>
              {phase === 'revealing' && index === correctIndex && (
                <svg className="ml-auto w-6 h-6 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {phase === 'revealing' && index === selectedOption && index !== correctIndex && (
                <svg className="ml-auto w-6 h-6 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
