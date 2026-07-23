'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getRoomByCode, getMyPlayer, getPlayers, joinRoom,
  submitAnswer, getRankings, getCurrentRound, getMyAnswer,
  signInAnonymously, getCurrentUser, buzzIn,
  adminGenerateRankings,
} from '@/app/game-actions';
import { useGameRealtime, useAntiCheat, useCountdown, useAnswerTimer } from '@/hooks/useGameRealtime';
import type {
  GameRoom, GamePlayer, GameQuestion, GameRound,
  GameAnswer, GameRanking, GameBroadcast
} from '@/types/game';
import GameAssistant from '@/components/GameAssistant';

type Phase = 'loading' | 'waiting' | 'playing' | 'revealed' | 'finished';

function MediaPlayArea({ mediaUrl, mediaType }: { mediaUrl: string; mediaType: string | null }) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

  useEffect(() => {
    setAutoplayFailed(false);
    const el = mediaRef.current;
    if (!el) return;
    const tryPlay = el.play();
    if (tryPlay && typeof tryPlay.catch === 'function') {
      tryPlay.catch(() => setAutoplayFailed(true));
    }
  }, [mediaUrl]);

  const handleManualPlay = () => {
    mediaRef.current?.play();
    setAutoplayFailed(false);
  };

  if (!mediaType) return null;

  return (
    <div className="mb-4 rounded-xl overflow-hidden bg-black/30 relative">
      {mediaType === 'video' ? (
        <>
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaUrl}
            controls
            playsInline
            className="w-full max-h-48 object-contain"
          />
          <div className="video-spoiler-blur" />
        </>
      ) : mediaType === 'audio' ? (
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 animate-pulse-soft">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={mediaUrl}
            controls
            playsInline
            className="flex-1 h-10"
          />
        </div>
      ) : null}
      {autoplayFailed && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium"
        >
          点击播放
        </button>
      )}
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomId as string;

  // 状态
  const [phase, setPhase] = useState<Phase>('loading');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [player, setPlayer] = useState<GamePlayer | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentRound, setCurrentRound] = useState<(GameRound & { question?: GameQuestion }) | null>(null);
  const [myAnswer, setMyAnswer] = useState<GameAnswer | null>(null);
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [streakMsg, setStreakMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buzzedIn, setBuzzedIn] = useState<string | null>(null); // player_id who buzzed in
  const [timerStarted, setTimerStarted] = useState(false); // host-controlled timer start
  const currentRoundNumRef = useRef(0); // track latest round number to filter stale DB updates
  const currentRoundIdRef = useRef<string>(''); // track current round ID for precise stale event filtering

  // 反作弊
  const antiCheat = useAntiCheat();
  const answerTimer = useAnswerTimer();
  const timerActive = phase === 'playing' && !hasSubmitted && timerStarted;
  const timeRemaining = useCountdown(
    currentRound?.time_limit_sec || 60,
    timerActive
  );

  // 加载房间信息 + 自动加入
  useEffect(() => {
    (async () => {
      try {
        // 检查是否有首页传来的用户信息
        const storedRealName = sessionStorage.getItem('real_name');
        const storedNickname = sessionStorage.getItem('nickname');

        if (!storedRealName || !storedNickname) {
          // 没有用户信息，跳转回首页
          router.push('/');
          return;
        }

        // 确保已登录
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          await signInAnonymously(storedNickname);
        }

        const r = await getRoomByCode(roomCode);
        setRoom(r);

        // 尝试获取当前玩家，如果没有则自动加入
        let me = await getMyPlayer(r.id);
        if (!me) {
          // 自动加入房间，随机分配A/B组（主持人稍后可调整）
          me = await joinRoom(r.id, storedRealName, storedNickname, Math.random() < 0.5 ? 'A' : 'B');
        }
        setPlayer(me);

        const allPlayers = await getPlayers(r.id);
        setPlayers(allPlayers);

        if (r.status === 'finished') {
          setPhase('finished');
          const rk = await getRankings(r.id);
          setRankings(rk);
        } else if (r.status === 'playing' || r.status === 'starting') {
          const round = await getCurrentRound(r.id);
          if (round) {
            setCurrentRound(round);
            currentRoundNumRef.current = round.round_number;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentRoundIdRef.current = (round as any).id || '';

            // 恢复抢答状态
            if (round.buzzed_in_player_id) {
              setBuzzedIn(round.buzzed_in_player_id);
            }

            // 检查玩家是否已答过此题
            if (me) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const myAns = await getMyAnswer((round as any).id, me.id);
              if (myAns) {
                setMyAnswer(myAns);
                setHasSubmitted(true);
              }
            }

            // 根据回合状态设置正确的 phase
            if (round.status === 'revealed') {
              setPhase('revealed');
            } else if (round.status === 'completed') {
              setPhase('waiting');
            } else {
              setPhase('playing');
            }
          } else {
            setPhase(r.status === 'starting' ? 'waiting' : 'playing');
          }
        } else {
          setPhase('waiting');
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '房间不存在');
      }
    })();
  }, [roomCode]);

  // 实时同步
  const { broadcast } = useGameRealtime({
    roomId: room?.id || '',
    onBroadcast: useCallback((msg: GameBroadcast) => {
      switch (msg.type) {
        case 'round_start':
          setPhase('playing');
          setHasSubmitted(false);
          setSelectedOption(null);
          setFreeText('');
          setMyAnswer(null);
          setBuzzedIn(null);
          setTimerStarted(false); // 等待主持人手动开始计时
          setStreakMsg('');
          setWarningMsg('');
          antiCheat.reset();
          if (msg.payload.round) {
            const roundData = msg.payload.round as GameRound & { question?: GameQuestion };
            currentRoundNumRef.current = roundData.round_number;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentRoundIdRef.current = (roundData as any).id || '';
            // Strip answer fields to prevent leakage via DevTools
            if (roundData.question) {
              const { correct_answer, correct_index, ...safeQ } = roundData.question;
              setCurrentRound({ ...roundData, question: safeQ as GameQuestion });
            } else {
              setCurrentRound(roundData);
            }
          }
          break;
        case 'timer_start':
          setTimerStarted(true);
          answerTimer.start();
          break;
        case 'round_reveal':
          // Sync the round ID ref immediately so that any delayed DB 'revealed' events
          // for THIS round are accepted, while stale events for OTHER rounds are rejected.
          if (msg.payload.round_id && currentRound) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentRoundIdRef.current = msg.payload.round_id as string;
          }
          setPhase('revealed');
          break;
        case 'media_unlock':
          if (currentRound && (msg.payload.round_id === currentRound.id || msg.payload.round_id === 'all')) {
            setCurrentRound({ ...currentRound, media_unlocked: msg.payload.unlocked as boolean });
          }
          break;
        case 'round_complete':
          // 刷新排名（加随机延迟避免雷群效应）
          if (room) {
            const jitter = Math.random() * 2000;
            setTimeout(() => {
              getRankings(room.id).then(setRankings).catch(() => {});
              getPlayers(room.id).then(setPlayers).catch(() => {});
            }, jitter);
          }
          break;
        case 'game_finish':
          setPhase('finished');
          if (room) {
            const jitter2 = Math.random() * 3000;
            setTimeout(() => {
              getRankings(room.id).then(setRankings).catch(() => {});
            }, jitter2);
          }
          break;
        case 'game_start':
          setPhase('waiting');
          break;
        case 'buzz_in':
          setBuzzedIn(msg.payload.player_id as string);
          break;
        case 'buzz_in_reset':
          setBuzzedIn(null);
          break;
        case 'player_group_change':
          if (player && msg.payload.player_id === player.id) {
            setPlayer({ ...player, group_label: msg.payload.group_label as 'A' | 'B' });
          }
          break;
      }
    }, [room, player, antiCheat, answerTimer]),
    onRoomUpdate: useCallback((r: GameRoom) => {
      setRoom(r);
      if (r.status === 'finished') setPhase('finished');
      if (r.status === 'starting') setPhase('waiting');
    }, []),
    onPlayerUpdate: useCallback((p: GamePlayer[]) => {
      setPlayers(p);
    }, []),
    onRoundUpdate: useCallback((round: GameRound & { question?: GameQuestion }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roundNum = (round as any).round_number as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roundId = (round as any).id as string;

      // Filter stale DB change events: if this round is older than what we're tracking,
      // ignore it to prevent race conditions (e.g., old round's completeRound arriving
      // after the new round's round_start broadcast)
      if (currentRoundNumRef.current > 0 && roundNum < currentRoundNumRef.current) {
        return;
      }

      // Update tracking refs if this is a newer round
      if (roundNum > currentRoundNumRef.current) {
        currentRoundNumRef.current = roundNum;
        currentRoundIdRef.current = roundId;
        // Immediately transition to 'playing' when a new round appears in DB.
        // This closes the race window where the new round's DB INSERT/UPDATE
        // arrives BEFORE the round_start broadcast, which previously left
        // phase stuck at 'revealed' while currentRound already held the new
        // question data — briefly exposing the new answer to the player.
        if (round.status !== 'completed' && round.status !== 'revealed') {
          setPhase('playing');
          setHasSubmitted(false);
          setSelectedOption(null);
          setFreeText('');
          setMyAnswer(null);
          setBuzzedIn(null);
          setTimerStarted(false);
          setStreakMsg('');
          setWarningMsg('');
          antiCheat.reset();
        }
      }

      // Sanitize: strip answer fields when round is active/pending to prevent
      // answer leakage via React DevTools or browser console inspection.
      if (round.question && (round.status === 'active' || round.status === 'pending')) {
        const { correct_answer, correct_index, ...safeQuestion } = round.question;
        setCurrentRound({ ...round, question: safeQuestion as GameQuestion });
      } else {
        setCurrentRound(round);
      }
      setBuzzedIn(round.buzzed_in_player_id || null);

      // Only set phase='revealed' if this is the current round (by ID match).
      // This prevents a stale 'revealed' DB event from the previous round
      // from accidentally showing the revealed phase while the player is
      // already on the next round in 'playing' phase.
      if (round.status === 'revealed' && (roundId === currentRoundIdRef.current || !currentRoundIdRef.current)) {
        setPhase('revealed');
      }
      if (round.status === 'completed') {
        // Only reset answer state if this completed round is the one we're currently on
        // (not a stale update for a round we've already moved past)
        if (roundNum === currentRoundNumRef.current) {
          setHasSubmitted(false);
          setSelectedOption(null);
          setFreeText('');
          setMyAnswer(null);
          setStreakMsg('');
          setWarningMsg('');
          setBuzzedIn(null);
          antiCheat.reset();
        }
      }
    }, [antiCheat]),
    subscribeToPlayers: false, // 玩家端不订阅玩家变更，避免 O(N²) 订阅风暴
  });

  // 提交答案
  const handleSubmitAnswer = async () => {
    if (!currentRound || !player || !room || hasSubmitted) return;

    const question = currentRound.question;
    if (!question) return;

    const isFreeText = !question.options || question.options.length === 0;
    if (isFreeText && !freeText.trim()) return;
    if (!isFreeText && selectedOption === null) return;

    setHasSubmitted(true);
    const timeTaken = answerTimer.getElapsed();

    try {
      const answer = await submitAnswer(
        currentRound.id,
        player.id,
        room.id,
        selectedOption ?? -1,
        isFreeText ? freeText.trim() : (question.options?.[selectedOption!]?.text || ''),
        timeTaken,
        antiCheat.screenSwitches
      );
      setMyAnswer(answer);

      // 本地更新玩家积分（乐观更新）
      if (player) {
        const pointsEarned = answer.is_correct ? 100 : 0;
        const newStreak = answer.is_correct ? (player.streak || 0) + 1 : 0;
        setPlayer({
          ...player,
          score: (player.score || 0) + pointsEarned,
          correct_count: (player.correct_count || 0) + (answer.is_correct ? 1 : 0),
          wrong_count: (player.wrong_count || 0) + (answer.is_correct ? 0 : 1),
          streak: newStreak,
          max_streak: Math.max(player.max_streak || 0, newStreak),
        });
      }

      // 广播已答题通知管理端
      await broadcast({
        type: 'player_answer',
        payload: { player_id: player.id, round_id: currentRound.id },
      });

      // 显示激励/警告消息
      if (answer.is_correct) {
        const correctCount = (player.correct_count || 0) + 1;
        const streak = (player.streak || 0) + 1;
        if (streak >= 3) {
          const totalBelow = players.filter(p => p.score < player.score + 100).length;
          const pct = Math.round((totalBelow / Math.max(players.length, 1)) * 100);
          setStreakMsg(`真棒！连续${streak}题正确，你已超过${pct}%的挑战者`);
        }
      }
      if (answer.is_correct === false) {
        const wrongCount = (player.wrong_count || 0) + 1;
        if (wrongCount >= 2) {
          setWarningMsg(`注意！你已答错${wrongCount}次，需要调整状态哦`);
        }
      }
    } catch (e: unknown) {
      setHasSubmitted(false);
      setError(e instanceof Error ? e.message : '提交失败');
    }
  };

  const handleBuzzIn = async () => {
    if (!currentRound || !player || buzzedIn) return;
    try {
      await buzzIn(currentRound.id, player.id);
      setBuzzedIn(player.id);
      await broadcast({
        type: 'buzz_in',
        payload: { player_id: player.id, player_name: player.nickname },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '抢答失败');
    }
  };

  // 时间到自动提交
  useEffect(() => {
    if (timeRemaining === 0 && phase === 'playing' && !hasSubmitted) {
      if (!buzzedIn || buzzedIn !== player?.id) {
        // 未抢到答题权，直接标记已提交（不发送答案）
        setHasSubmitted(true);
        return;
      }
      handleSubmitAnswer();
    }
  }, [timeRemaining]);

  // ============================================================
  // 渲染各阶段
  // ============================================================

  if (error && !room) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">&#x2753;</div>
          <h2 className="text-xl font-bold mb-2">房间未找到</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">返回首页</button>
        </div>
      </main>
    );
  }

  // 加载阶段
  if (phase === 'loading') {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-[var(--text-secondary)] mb-2">正在加入游戏...</div>
          <p className="text-xs text-[var(--text-secondary)]">
            房间码: <span className="font-mono text-blue-400">{roomCode}</span>
          </p>
          {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
        </div>
      </main>
    );
  }

  // 等待阶段
  if (phase === 'waiting') {
    const groupA = players.filter(p => p.group_label === 'A');
    const groupB = players.filter(p => p.group_label === 'B');

    return (
      <main className="min-h-[100dvh] px-4 py-8 max-w-lg mx-auto">
        <div className="text-center mb-6 animate-fadeIn">
          <h2 className="text-2xl font-bold">等待开始</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            等待主持人开始游戏...
          </p>
          {room && (
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              房间码: <span className="font-mono text-blue-400">{room.room_code}</span>
            </p>
          )}
        </div>

        {/* 在线人数 */}
        <div className="glass-card p-5 mb-6 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-1">当前在线</p>
          <p className="text-4xl font-bold text-blue-400">{players.length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">名玩家已加入</p>
        </div>

        {/* 两组玩家列表 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-card-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="group-badge group-a">A</span>
              <span className="font-semibold text-blue-400">A组 ({groupA.length}人)</span>
            </div>
            <div className="space-y-2">
              {groupA.map(p => (
                <div key={p.id} className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="truncate">{p.nickname}</span>
                  {p.id === player?.id && <span className="text-xs text-blue-400">(你)</span>}
                </div>
              ))}
              {groupA.length === 0 && <p className="text-xs text-[var(--text-secondary)]">暂无玩家</p>}
            </div>
          </div>

          <div className="glass-card-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="group-badge group-b">B</span>
              <span className="font-semibold text-yellow-400">B组 ({groupB.length}人)</span>
            </div>
            <div className="space-y-2">
              {groupB.map(p => (
                <div key={p.id} className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="truncate">{p.nickname}</span>
                  {p.id === player?.id && <span className="text-xs text-yellow-400">(你)</span>}
                </div>
              ))}
              {groupB.length === 0 && <p className="text-xs text-[var(--text-secondary)]">暂无玩家</p>}
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="animate-pulse-soft inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            等待主持人开始...
          </div>
        </div>
        <GameAssistant roomId={room?.id} playerId={player?.id} mode="player" />
      </main>
    );
  }

  // 答题阶段
  if (phase === 'playing' && currentRound?.question) {
    const q = currentRound.question;
    const hasOptions = q.options && q.options.length > 0;
    const isBonus = q.is_bonus || q.difficulty === 'bonus';
    const timerPct = timeRemaining / (currentRound.time_limit_sec || 60);
    const circumference = 2 * Math.PI * 35;
    const offset = circumference * (1 - timerPct);

    return (
      <main className="min-h-[100dvh] px-4 py-6 max-w-lg mx-auto">
        {/* 顶部信息栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`group-badge group-${(player?.group_label || 'a').toLowerCase()}`}>
              {player?.group_label}
            </span>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">第 {currentRound.round_number} 题</p>
              <p className="text-sm font-semibold">{player?.nickname}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)]">积分</p>
              <p className="text-lg font-bold text-blue-400">{player?.score || 0}</p>
            </div>
            {/* 计时器 */}
            <div className="timer-ring">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle className="bg" cx="40" cy="40" r="35"/>
                {timerStarted && (
                  <circle
                    className={`fg ${timeRemaining <= 5 ? 'danger' : timeRemaining <= 10 ? 'warning' : ''}`}
                    cx="40" cy="40" r="35"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold ${
                  !timerStarted ? 'text-green-400' :
                  timeRemaining <= 5 ? 'text-red-400' : ''
                }`}>
                  {timerStarted ? timeRemaining : '准备'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 实时组别积分对比 */}
        {(() => {
          const scoreA = players.filter(p => p.group_label === 'A').reduce((s, p) => s + (p.score || 0), 0);
          const scoreB = players.filter(p => p.group_label === 'B').reduce((s, p) => s + (p.score || 0), 0);
          const total = Math.max(scoreA + scoreB, 1);
          const pctA = Math.round((scoreA / total) * 100);
          return (
            <div className="glass-card p-3 mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-blue-400 font-medium">A组 {scoreA}分</span>
                <span className="text-yellow-400 font-medium">B组 {scoreB}分</span>
              </div>
              <div className="h-3 bg-[rgba(148,163,184,0.1)] rounded-full overflow-hidden flex">
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-700 rounded-l-full" style={{ width: `${pctA}%` }} />
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full transition-all duration-700 rounded-r-full flex-1" />
              </div>
            </div>
          );
        })()}

        {/* 彩蛋/难度提示 */}
        {isBonus && (
          <div className="bonus-bubble mb-4 animate-fadeIn">
            {q.bonus_message || '本题较难，答对可额外获得周边奖励！'}
          </div>
        )}

        {/* 切屏警告 */}
        {antiCheat.screenSwitches > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="yellow-card">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              切屏{antiCheat.screenSwitches}次
            </span>
            {antiCheat.screenSwitches >= 2 && (
              <span className="text-xs text-yellow-400">黄牌警告！</span>
            )}
          </div>
        )}

        {/* 题目卡片 */}
        <div className="glass-card p-6 mb-6 animate-fadeIn">
          {/* 题目类型标签 */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              q.type === 'video_clip' ? 'bg-purple-500/20 text-purple-400' :
              q.type === 'audio_clip' || q.type === 'song_guess' ? 'bg-blue-500/20 text-blue-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {q.type === 'video_clip' ? '影视片段' :
               q.type === 'audio_clip' || q.type === 'song_guess' ? '听歌猜名' :
               q.type === 'dialect' ? '方言挑战' : '知识问答'}
            </span>
            {q.difficulty === 'hard' && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">较难</span>
            )}
            {q.difficulty === 'easy' && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">简单</span>
            )}
          </div>

          {/* 媒体播放器 - 主持人开放后可见 */}
          {q.media_url && (
            currentRound.media_unlocked ? (
              <MediaPlayArea
                mediaUrl={q.media_url}
                mediaType={q.media_type || (q.type === 'video_clip' ? 'video' : q.type === 'song_guess' || q.type === 'dialect' ? 'audio' : null)}
              />
            ) : (
              <div className="mb-4 rounded-xl overflow-hidden bg-[rgba(15,23,42,0.6)] border border-[var(--glass-border)] p-6 text-center">
                <div className="text-3xl mb-3">
                  {q.type === 'video_clip' ? '🎬' : q.type === 'song_guess' ? '🎵' : '🔊'}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  {q.type === 'video_clip' ? '影视片段播放中...' : '音频播放中...'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  媒体内容仅在主持人控制台显示
                </p>
                <p className="text-xs text-blue-400 mt-2">
                  等待主持人开放权限...
                </p>
              </div>
            )
          )}

          {/* 题目文字 */}
          <p className="text-base leading-relaxed whitespace-pre-line">{q.question_text}</p>
        </div>

        {/* 抢答/答题区域 */}
        {!buzzedIn ? (
          <div className="text-center mb-6">
            <button
              onClick={handleBuzzIn}
              className="buzz-in-btn"
              disabled={hasSubmitted}
            >
              抢答！
            </button>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              第一个抢到的玩家获得答题权
            </p>
          </div>
        ) : buzzedIn === player?.id ? (
          <div className="space-y-3 mb-6">
            <div className="text-center text-sm text-green-400 font-medium mb-2 animate-fadeIn">
              你抢到了！请作答
            </div>
            {!hasSubmitted ? (
              <>
                {hasOptions ? (
                  q.options!.map((opt) => (
                    <button
                      key={opt.index}
                      onClick={() => setSelectedOption(opt.index)}
                      className={`option-btn ${selectedOption === opt.index ? 'selected' : ''}`}
                    >
                      {opt.text}
                    </button>
                  ))
                ) : (
                  <textarea
                    className="free-answer"
                    placeholder="输入你的答案..."
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    rows={3}
                  />
                )}
                <button
                  onClick={handleSubmitAnswer}
                  disabled={hasOptions ? selectedOption === null : !freeText.trim()}
                  className="btn-primary mt-2"
                >
                  提交答案
                </button>
              </>
            ) : (
              <div className="text-center text-sm text-[var(--text-secondary)] py-4">
                已提交，等待主持人揭晓答案...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center mb-6 glass-card p-6">
            <div className="text-2xl mb-2">&#9203;</div>
            <p className="text-sm text-[var(--text-secondary)]">
              已被其他玩家抢答，等待其作答...
            </p>
          </div>
        )}

        {/* 激励/警告消息 */}
        {streakMsg && <div className="streak-bubble mb-4">{streakMsg}</div>}
        {warningMsg && <div className="warning-bubble mb-4">{warningMsg}</div>}

        {/* 累计答错 - 趣味惩罚提示 */}
        {player && player.wrong_count >= 2 && (
          <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
            <p className="text-sm text-purple-300 font-medium">
              {player.wrong_count === 2
                ? '🎤 答错2次！准备表演一个节目吧~'
                : player.wrong_count === 3
                ? '🍺 答错3次！自罚一杯没商量！'
                : `😈 已翻车${player.wrong_count}次，"奖励"加倍哦~`}
            </p>
          </div>
        )}

        {/* 彩蛋奖励提示 */}
        {myAnswer?.is_correct && currentRound.question?.is_bonus && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center animate-fadeIn">
            <p className="text-sm font-bold text-yellow-400">
              🎁 {player?.nickname}，请领取奖励！
            </p>
            {currentRound.question.bonus_message && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {currentRound.question.bonus_message}
              </p>
            )}
          </div>
        )}

        <GameAssistant roomId={room?.id} playerId={player?.id} mode="player" />
      </main>
    );
  }

  // 揭晓答案阶段
  if (phase === 'revealed' && currentRound?.question) {
    const q = currentRound.question;
    const isCorrect = myAnswer?.is_correct === true;
    const didAnswer = myAnswer != null;
    const currentStreak = player?.streak || 0;

    return (
      <main className="min-h-[100dvh] px-4 py-6 max-w-lg mx-auto">
        <div className={`text-center mb-6 animate-fadeIn ${isCorrect ? 'correct-celebration' : didAnswer ? 'wrong-shake' : ''}`}>
          <div className="text-6xl mb-3">{isCorrect ? '🎉' : didAnswer ? '😅' : '⏰'}</div>
          <h2 className={`text-2xl font-bold ${isCorrect ? 'text-green-400' : didAnswer ? 'text-red-400' : 'text-yellow-400'}`}>
            {isCorrect ? '回答正确！' : didAnswer ? '回答错误' : '本题未作答'}
          </h2>
          {isCorrect && (
            <p className="text-lg font-bold text-blue-400 mt-2">
              +{myAnswer?.points_earned || 0} 分
            </p>
          )}
          {/* 连击火焰效果 */}
          {isCorrect && currentStreak >= 2 && (
            <div className="streak-fire mt-3 inline-block">
              🔥 连对 {currentStreak} 题！
            </div>
          )}
        </div>

        {/* 正确答案 */}
        <div className="glass-card p-5 mb-6 animate-slideUp">
          <p className="text-xs text-[var(--text-secondary)] mb-2">正确答案</p>
          <p className="text-lg font-bold text-green-400">{q.correct_answer}</p>
          {q.answer_explanation && (
            <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
              {q.answer_explanation}
            </p>
          )}
          {q.source_info && (
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              来源: {q.source_info}
            </p>
          )}
        </div>

        {/* 我的回答 */}
        {myAnswer && (
          <div className="glass-card-sm p-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">你的答案</span>
              <span>{myAnswer.selected_text || '未作答'}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[var(--text-secondary)]">用时</span>
              <span>{(myAnswer.time_taken_ms / 1000).toFixed(1)}s</span>
            </div>
            {myAnswer.screen_switches > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[var(--text-secondary)]">切屏次数</span>
                <span className="text-yellow-400">{myAnswer.screen_switches}次</span>
              </div>
            )}
          </div>
        )}

        {/* 激励/警告 */}
        {streakMsg && <div className="streak-bubble mb-4">{streakMsg}</div>}
        {warningMsg && <div className="warning-bubble mb-4">{warningMsg}</div>}

        {/* 累计答错 - 趣味惩罚提示 */}
        {player && player.wrong_count >= 2 && (
          <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
            <p className="text-sm text-purple-300 font-medium">
              {player.wrong_count === 2
                ? '🎤 答错2次！准备表演一个节目吧~'
                : player.wrong_count === 3
                ? '🍺 答错3次！自罚一杯没商量！'
                : `😈 已翻车${player.wrong_count}次，"奖励"加倍哦~`}
            </p>
          </div>
        )}

        {/* 彩蛋奖励 - 答对彩蛋题 */}
        {isCorrect && q.is_bonus && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center animate-fadeIn">
            <div className="text-3xl mb-2">🎁</div>
            <p className="text-base font-bold text-yellow-400">
              {player?.nickname}，请领取奖励！
            </p>
            {q.bonus_message && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{q.bonus_message}</p>
            )}
          </div>
        )}

        <div className="text-center text-sm text-[var(--text-secondary)] mt-8">
          等待下一题...
        </div>
      </main>
    );
  }

  // 游戏结束
  if (phase === 'finished') {
    const myRank = rankings.find(r => r.player_id === player?.id);
    const myGroup = player?.group_label;
    const groupRankings = rankings.filter(r => r.group_label === myGroup);
    const totalQ = (player?.correct_count || 0) + (player?.wrong_count || 0);
    const myAccuracy = totalQ > 0 ? Math.round(((player?.correct_count || 0) / totalQ) * 100) : 0;

    return (
      <main className="min-h-[100dvh] px-4 py-8 max-w-lg mx-auto">
        <div className="text-center mb-6 animate-fadeIn">
          <h2 className="text-2xl font-bold mb-2">🎮 游戏结束</h2>
          {myRank && (
            <p className="text-lg">
              总排名
              <span className="text-3xl font-bold text-yellow-400 mx-1">#{myRank.rank_position}</span>
            </p>
          )}
        </div>

        {/* 我的成绩卡 */}
        <div className="glass-card p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`group-badge group-${(myGroup || 'a').toLowerCase()}`}>{myGroup}</span>
            <div>
              <p className="font-semibold">{player?.nickname}</p>
              <p className="text-xs text-[var(--text-secondary)]">最终成绩</p>
            </div>
            <p className="ml-auto text-3xl font-bold text-blue-400">{player?.score || 0}<span className="text-sm text-[var(--text-secondary)]">分</span></p>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-[rgba(15,23,42,0.4)] rounded-lg p-2">
              <p className="text-lg font-bold text-green-400">{player?.correct_count || 0}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">正确</p>
            </div>
            <div className="bg-[rgba(15,23,42,0.4)] rounded-lg p-2">
              <p className="text-lg font-bold text-red-400">{player?.wrong_count || 0}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">错误</p>
            </div>
            <div className="bg-[rgba(15,23,42,0.4)] rounded-lg p-2">
              <p className={`text-lg font-bold ${myAccuracy >= 80 ? 'text-green-400' : myAccuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{myAccuracy}%</p>
              <p className="text-[10px] text-[var(--text-secondary)]">正确率</p>
            </div>
            <div className="bg-[rgba(15,23,42,0.4)] rounded-lg p-2">
              <p className="text-lg font-bold text-yellow-400">{player?.max_streak || 0}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">最长连对</p>
            </div>
          </div>
        </div>

        {/* 总排名 */}
        <div className="glass-card p-5 mb-6">
          <h3 className="font-bold mb-4 text-center">🏆 总排名</h3>

          {/* 领奖台（前3名） */}
          {rankings.length >= 3 && (
            <div className="podium mb-4">
              <div className="podium-item">
                <p className="text-xs text-center mb-1">{rankings[1]?.player?.nickname}</p>
                <div className="podium-bar silver">
                  <span className="text-2xl">2</span>
                  <span className="text-xs">{rankings[1]?.final_score}分</span>
                </div>
              </div>
              <div className="podium-item">
                <p className="text-xs text-center mb-1">{rankings[0]?.player?.nickname}</p>
                <div className="podium-bar gold">
                  <span className="text-2xl">1</span>
                  <span className="text-xs">{rankings[0]?.final_score}分</span>
                </div>
              </div>
              <div className="podium-item">
                <p className="text-xs text-center mb-1">{rankings[2]?.player?.nickname}</p>
                <div className="podium-bar bronze">
                  <span className="text-2xl">3</span>
                  <span className="text-xs">{rankings[2]?.final_score}分</span>
                </div>
              </div>
            </div>
          )}

          {/* 完整排名 */}
          <div className="space-y-2">
            {rankings.map((r) => (
              <div key={r.id} className={`flex items-center gap-2 py-2 px-3 rounded-lg ${
                r.player_id === player?.id ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-[rgba(15,23,42,0.4)]'
              }`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  r.rank_position === 1 ? 'bg-yellow-500 text-black' :
                  r.rank_position === 2 ? 'bg-gray-400 text-black' :
                  r.rank_position === 3 ? 'bg-amber-700 text-white' :
                  'bg-[rgba(148,163,184,0.15)] text-[var(--text-secondary)]'
                }`}>
                  {r.rank_position}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                  r.group_label === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{r.group_label}</span>
                <span className="flex-1 min-w-0 text-sm font-medium">{r.player?.nickname}</span>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="text-blue-400 font-bold">{r.final_score}分</span>
                  <span className={`${r.accuracy_rate >= 80 ? 'text-green-400' : r.accuracy_rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {r.accuracy_rate}%
                  </span>
                  {r.player_id === player?.id && (
                    <span className="text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-full text-[10px]">你</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 分组排名 */}
        <div className="glass-card p-5 mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <span className={`group-badge group-${(myGroup || 'a').toLowerCase()}`}>{myGroup}</span>
            {myGroup}组排名
          </h3>
          <div className="space-y-1.5">
            {groupRankings.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm ${
                r.player_id === player?.id ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-[rgba(15,23,42,0.4)]'
              }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)]'
                }`}>{i + 1}</span>
                <span className="flex-1 min-w-0 font-medium">{r.player?.nickname}</span>
                <span className="font-bold text-blue-400">{r.final_score}分</span>
                <span className="text-xs text-[var(--text-secondary)]">{r.correct_count}✓{r.wrong_count}✗</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => router.push('/')} className="btn-secondary w-full">
          返回首页
        </button>
      </main>
    );
  }

  // 默认加载状态
  return (
    <main className="min-h-[100dvh] flex items-center justify-center">
      <div className="animate-pulse text-[var(--text-secondary)]">加载中...</div>
    </main>
  );
}
