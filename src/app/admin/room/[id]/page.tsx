'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getRoom, getPlayers, getActiveQuestions, getCurrentRound,
  updateRoomStatus, updateCurrentRound, createRound,
  startRound, revealRound, completeRound, goBackRound, toggleMediaUnlock,
  adminResetBuzzIn, adminAssignBuzzIn,
  getRoundAnswers, assignGroup, adminApplyScore, removePlayer,
  adminGenerateRankings, getRankings,
} from '@/app/game-actions';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import GameAssistant from '@/components/GameAssistant';
import type {
  GameRoom, GamePlayer, GameQuestion, GameRound,
  GameRanking, GroupLabel, GameBroadcast
} from '@/types/game';

type Tab = 'control' | 'players' | 'anticheat' | 'ranking';

export default function AdminRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentRound, setCurrentRound] = useState<(GameRound & { question?: GameQuestion }) | null>(null);
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [answers, setAnswers] = useState<unknown[]>([]);
  const [tab, setTab] = useState<Tab>('control');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 初始化
  useEffect(() => {
    (async () => {
      try {
        const [r, p, q] = await Promise.all([
          getRoom(roomId),
          getPlayers(roomId),
          getActiveQuestions(),
        ]);
        setRoom(r);
        setPlayers(p);
        setQuestions(q);

        const round = await getCurrentRound(roomId);
        if (round) {
          setCurrentRound(round);
          const ans = await getRoundAnswers(round.id);
          setAnswers(ans);
        }

        // 如果游戏已结束，加载排名数据
        if (r.status === 'finished') {
          const rk = await getRankings(roomId);
          setRankings(rk);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '加载失败');
      }
      setLoading(false);
    })();
  }, [roomId]);

  // 实时同步
  const { broadcast } = useGameRealtime({
    roomId,
    onRoomUpdate: useCallback((r: GameRoom) => setRoom(r), []),
    onPlayerUpdate: useCallback((p: GamePlayer[]) => setPlayers(p), []),
    onRoundUpdate: useCallback(async (round: GameRound & { question?: GameQuestion }) => {
      setCurrentRound(round);
      try {
        const ans = await getRoundAnswers(round.id);
        setAnswers(ans);
      } catch {}
    }, []),
    onBroadcast: useCallback(async (msg: GameBroadcast) => {
      if (msg.type === 'player_answer' || msg.type === 'round_complete' || msg.type === 'buzz_in') {
        if (currentRound) {
          const ans = await getRoundAnswers(currentRound.id);
          setAnswers(ans);
        }
        const p = await getPlayers(roomId);
        setPlayers(p);
      }
    }, [currentRound, roomId]),
  });

  // ============================================================
  // 控制操作
  // ============================================================

  const handleStartGame = async () => {
    if (questions.length === 0) {
      setError('没有可用的题目');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await updateRoomStatus(roomId, 'starting');
      await broadcast({ type: 'game_start', payload: {} });

      const q = questions[0];
      const round = await createRound(roomId, 1, q.id, room?.config?.time_per_question_sec || 30);
      await updateCurrentRound(roomId, 1);
      await startRound(round.id);
      const roundWithQuestion = { ...round, question: q };
      setCurrentRound(roundWithQuestion);

      await updateRoomStatus(roomId, 'playing');

      await broadcast({
        type: 'round_start',
        payload: { round_number: 1, round: roundWithQuestion },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setActionLoading(false);
  };

  const handleToggleMedia = async () => {
    if (!currentRound) return;
    const newUnlocked = !currentRound.media_unlocked;
    try {
      await toggleMediaUnlock(currentRound.id, newUnlocked);
      setCurrentRound({ ...currentRound, media_unlocked: newUnlocked });
      await broadcast({
        type: 'media_unlock',
        payload: { round_id: currentRound.id, unlocked: newUnlocked },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const handleResetBuzzIn = async () => {
    if (!currentRound) return;
    try {
      await adminResetBuzzIn(currentRound.id);
      setCurrentRound({ ...currentRound, buzzed_in_player_id: null });
      await broadcast({
        type: 'buzz_in_reset',
        payload: { round_id: currentRound.id },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '重置抢答失败');
    }
  };

  const handleAssignBuzzIn = async (playerId: string) => {
    if (!currentRound) return;
    try {
      await adminAssignBuzzIn(currentRound.id, playerId);
      setCurrentRound({ ...currentRound, buzzed_in_player_id: playerId });
      const assignedPlayer = players.find(p => p.id === playerId);
      await broadcast({
        type: 'buzz_in',
        payload: { player_id: playerId, player_name: assignedPlayer?.nickname || '未知' },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '指定答题人失败');
    }
  };

  const handleGoBack = async () => {
    if (!room || !currentRound) return;
    setActionLoading(true);
    setError('');
    try {
      // 将当前回合完成，回到上一题
      await completeRound(currentRound.id);
      const prevRound = await goBackRound(room.id);
      // 重新获取上一题的完整数据
      const round = await getCurrentRound(room.id);
      if (round) {
        setCurrentRound(round);
        setAnswers([]);
      }
      // 广播上一题开始
      await broadcast({
        type: 'round_start',
        payload: { round_number: (room.current_round || 1) - 1, round: round || undefined },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setActionLoading(false);
  };

  const handleNextQuestion = async () => {
    if (!room) return;
    setError('');
    const nextNum = (room.current_round || 0) + 1;
    if (nextNum > questions.length) {
      // 游戏结束
      await handleFinishGame();
      return;
    }

    setActionLoading(true);
    try {
      // 完成当前回合
      if (currentRound) {
        await completeRound(currentRound.id);
        await broadcast({
          type: 'round_complete',
          payload: { round_id: currentRound.id },
        });
      }
      const q = questions[nextNum - 1];
      const round = await createRound(roomId, nextNum, q.id, room.config.time_per_question_sec || 30);
      await updateCurrentRound(roomId, nextNum);
      await startRound(round.id);
      const roundWithQuestion = { ...round, question: q };
      setCurrentRound(roundWithQuestion);
      setAnswers([]);

      // 广播新一轮开始
      await broadcast({
        type: 'round_start',
        payload: { round_number: nextNum, round: roundWithQuestion },
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setActionLoading(false);
  };

  const handleRevealAnswer = async () => {
    if (!currentRound) return;
    setActionLoading(true);
    try {
      await revealRound(currentRound.id);
      // 广播答案揭晓
      await broadcast({
        type: 'round_reveal',
        payload: { round_id: currentRound.id },
      });
      // 刷新排名
      const p = await getPlayers(roomId);
      setPlayers(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setActionLoading(false);
  };

  const handleFinishGame = async () => {
    setActionLoading(true);
    setError('');
    try {
      if (currentRound) {
        await completeRound(currentRound.id);
        await broadcast({
          type: 'round_complete',
          payload: { round_id: currentRound.id },
        });
      }
      await adminGenerateRankings(roomId);
      await updateRoomStatus(roomId, 'finished');
      await broadcast({ type: 'game_finish', payload: {} });
      const r = await getRankings(roomId);
      setRankings(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setActionLoading(false);
  };

  const handleAssignGroup = async (playerId: string, group: GroupLabel) => {
    try {
      await assignGroup(playerId, group);
      const p = await getPlayers(roomId);
      setPlayers(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分组失败');
    }
  };

  const handleAddScore = async (playerId: string, points: number) => {
    try {
      await adminApplyScore(playerId, points);
      const p = await getPlayers(roomId);
      setPlayers(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '修改分数失败');
    }
  };

  const handleRemovePlayer = async (playerId: string, nickname: string) => {
    if (!confirm(`确定移除玩家「${nickname}」吗？其答题记录也将被清除。`)) return;
    try {
      await removePlayer(playerId);
      const p = await getPlayers(roomId);
      setPlayers(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '移除失败');
    }
  };

  // ============================================================
  // 渲染
  // ============================================================

  if (loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">加载中...</div>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/admin')} className="btn-primary">返回</button>
        </div>
      </main>
    );
  }

  const groupA = players.filter(p => p.group_label === 'A');
  const groupB = players.filter(p => p.group_label === 'B');
  const scoreA = groupA.reduce((s, p) => s + p.score, 0);
  const scoreB = groupB.reduce((s, p) => s + p.score, 0);
  const answeredCount = answers.length;
  const totalPlayers = players.length;

  return (
    <main className="min-h-[100dvh] bg-[var(--bg-primary)]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="text-[var(--text-secondary)] hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="font-bold text-sm">游戏控制台</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                房间码: <span className="font-mono text-blue-400">{room?.room_code}</span>
                {' | '}
                <span className={room?.status === 'playing' ? 'text-green-400' : 'text-yellow-400'}>
                  {room?.status === 'waiting' ? '等待中' : room?.status === 'playing' ? '进行中' : room?.status === 'finished' ? '已结束' : '准备中'}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">A组 vs B组</p>
            <p className="text-sm font-bold">
              <span className="text-blue-400">{scoreA}</span>
              <span className="text-[var(--text-secondary)] mx-2">:</span>
              <span className="text-yellow-400">{scoreB}</span>
            </p>
          </div>
        </div>
      </header>

      {/* Tab栏 */}
      <nav className="sticky top-[57px] z-40 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto flex">
          {[
            { id: 'control' as Tab, label: '游戏控制' },
            { id: 'players' as Tab, label: `玩家 (${players.length})` },
            { id: 'anticheat' as Tab, label: '反作弊' },
            { id: 'ranking' as Tab, label: '排行榜' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto p-4">
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-400">{error}</div>}

        {/* 游戏控制 */}
        {tab === 'control' && (
          <div className="space-y-6">
            {/* 控制按钮 */}
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">流程控制</h3>
              <div className="flex gap-3 flex-wrap">
                {room?.status === 'waiting' && (
                  <button onClick={handleStartGame} disabled={actionLoading || players.length < 1} className="btn-success" style={{ width: 'auto', padding: '12px 24px' }}>
                    {actionLoading ? '处理中...' : `开始游戏 (${players.length}人已加入)`}
                  </button>
                )}
                {(room?.status === 'starting' || room?.status === 'playing') && currentRound?.status === 'active' && (
                  <button onClick={handleRevealAnswer} disabled={actionLoading} className="btn-primary" style={{ width: 'auto', padding: '12px 24px' }}>
                    揭晓答案
                  </button>
                )}
                {(room?.status === 'starting' || room?.status === 'playing') && (room.current_round || 0) > 1 && (
                  <button onClick={handleGoBack} disabled={actionLoading} className="btn-secondary" style={{ width: 'auto', padding: '12px 24px', opacity: 0.8 }}>
                    ← 上一题
                  </button>
                )}
                {(room?.status === 'starting' || room?.status === 'playing') && (
                  <button onClick={handleNextQuestion} disabled={actionLoading} className="btn-secondary" style={{ width: 'auto', padding: '12px 24px' }}>
                    {currentRound?.status === 'revealed' ? `下一题 (${room.current_round + 1}/${questions.length})` : '跳过/下一题'}
                  </button>
                )}
                {room?.status === 'playing' && (
                  <button onClick={handleFinishGame} disabled={actionLoading} className="btn-danger" style={{ width: 'auto', padding: '12px 24px' }}>
                    结束游戏
                  </button>
                )}
                {room?.status === 'finished' && (
                  <div className="text-green-400 font-semibold py-2">游戏已结束，请查看排行榜</div>
                )}
              </div>
            </div>

            {/* 当前题目 */}
            {currentRound?.question && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">第 {currentRound.round_number} 题</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      currentRound.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      currentRound.status === 'revealed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {currentRound.status === 'active' ? '答题中' : currentRound.status === 'revealed' ? '已揭晓' : '已完成'}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {answeredCount}/{totalPlayers} 人已答
                    </span>
                  </div>
                </div>
                {/* 媒体播放器 - 仅主持人可见 */}
                {currentRound.question.media_url && (
                  <>
                  <div className="mb-4 rounded-xl overflow-hidden bg-black/30">
                    {(currentRound.question.media_type === 'video' || (currentRound.question.type === 'video_clip')) ? (
                      <video
                        src={currentRound.question.media_url}
                        controls
                        autoPlay
                        className="w-full max-h-64 object-contain"
                        playsInline
                      />
                    ) : (currentRound.question.media_type === 'audio' || currentRound.question.type === 'song_guess') ? (
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                        <audio src={currentRound.question.media_url} controls autoPlay className="flex-1 h-10" playsInline/>
                      </div>
                    ) : null}
                  </div>
                  {/* 媒体权限开关 */}
                  <button
                    onClick={handleToggleMedia}
                    className={`mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      currentRound.media_unlocked
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
                    }`}
                  >
                    {currentRound.media_unlocked ? '🔓 玩家可见媒体' : '🔒 玩家不可见媒体'}
                  </button>
                  </>
                )}
                <p className="text-sm leading-relaxed mb-3">{currentRound.question.question_text}</p>
                {/* 抢答状态 */}
                {currentRound.buzzed_in_player_id && (
                  <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <span className="text-orange-400 font-bold text-sm">
                      已抢答: {players.find(p => p.id === currentRound.buzzed_in_player_id)?.nickname || '未知玩家'}
                    </span>
                    <button
                      onClick={handleResetBuzzIn}
                      className="px-3 py-1 rounded text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                    >
                      重置抢答
                    </button>
                  </div>
                )}
                {!currentRound.buzzed_in_player_id && currentRound.status === 'active' && (
                  <div className="mb-3 p-3 rounded-lg bg-[rgba(148,163,184,0.05)] border border-[var(--glass-border)]">
                    <p className="text-xs text-[var(--text-secondary)] mb-2">指定答题人（替代抢答）：</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {players.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAssignBuzzIn(p.id)}
                          className="px-2 py-1 rounded text-xs bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)] hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                        >
                          {p.nickname}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-sm text-[var(--text-secondary)]">
                  正确答案: <span className="text-green-400 font-medium">{currentRound.question.correct_answer}</span>
                </div>
                {currentRound.question.is_bonus && (
                  <p className="text-xs text-yellow-400 mt-2">彩蛋题 - 答对额外奖励</p>
                )}
                {/* 答题进度 */}
                <div className="mt-4">
                  <div className="h-2 bg-[rgba(148,163,184,0.1)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(answeredCount / Math.max(totalPlayers, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* 快捷统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card text-center">
                <p className="text-2xl font-bold text-blue-400">{players.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">玩家总数</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold text-green-400">{room?.current_round || 0}</p>
                <p className="text-xs text-[var(--text-secondary)]">当前题号</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold text-blue-400">{groupA.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">A组人数</p>
              </div>
              <div className="stat-card text-center">
                <p className="text-2xl font-bold text-yellow-400">{groupB.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">B组人数</p>
              </div>
            </div>
          </div>
        )}

        {/* 玩家管理 */}
        {tab === 'players' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* A组 */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="group-badge group-a">A</span>
                  <span className="font-bold text-blue-400">A组 ({groupA.length}人)</span>
                </div>
                <div className="space-y-2">
                  {groupA.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(15,23,42,0.4)]">
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.nickname}</span>
                        <span className="text-xs text-[var(--text-secondary)] ml-1">({p.real_name})</span>
                      </span>
                      <span className="text-sm font-bold text-blue-400 w-10 text-right">{p.score}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleAddScore(p.id, 100)} className="w-7 h-7 rounded-md bg-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/30" title="+100分">+</button>
                        <button onClick={() => handleAddScore(p.id, -100)} className="w-7 h-7 rounded-md bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30" title="-100分">-</button>
                        <button onClick={() => handleAssignGroup(p.id, 'B')} className="w-7 h-7 rounded-md bg-yellow-500/20 text-yellow-400 text-xs font-bold hover:bg-yellow-500/30" title="移到B组">B</button>
                        <button onClick={() => handleRemovePlayer(p.id, p.nickname)} className="w-7 h-7 rounded-md bg-gray-500/20 text-gray-400 text-xs font-bold hover:bg-gray-500/30" title="移除">x</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* B组 */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="group-badge group-b">B</span>
                  <span className="font-bold text-yellow-400">B组 ({groupB.length}人)</span>
                </div>
                <div className="space-y-2">
                  {groupB.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(15,23,42,0.4)]">
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.nickname}</span>
                        <span className="text-xs text-[var(--text-secondary)] ml-1">({p.real_name})</span>
                      </span>
                      <span className="text-sm font-bold text-yellow-400 w-10 text-right">{p.score}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleAddScore(p.id, 100)} className="w-7 h-7 rounded-md bg-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/30" title="+100分">+</button>
                        <button onClick={() => handleAddScore(p.id, -100)} className="w-7 h-7 rounded-md bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30" title="-100分">-</button>
                        <button onClick={() => handleAssignGroup(p.id, 'A')} className="w-7 h-7 rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/30" title="移到A组">A</button>
                        <button onClick={() => handleRemovePlayer(p.id, p.nickname)} className="w-7 h-7 rounded-md bg-gray-500/20 text-gray-400 text-xs font-bold hover:bg-gray-500/30" title="移除">x</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 反作弊 */}
        {tab === 'anticheat' && (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="font-bold mb-4">切屏检测记录</h3>
              {currentRound && answers.length > 0 ? (
                <div className="space-y-2">
                  {(answers as Array<{
                    player_id: string;
                    screen_switches: number;
                    has_yellow_card: boolean;
                    time_taken_ms: number;
                    is_correct: boolean;
                    player?: { nickname: string };
                  }>).map((a, i) => (
                    <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                      a.has_yellow_card ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-[rgba(15,23,42,0.4)]'
                    }`}>
                      <span className="flex-1 text-sm">{a.player?.nickname || '未知'}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{(a.time_taken_ms / 1000).toFixed(1)}s</span>
                      {a.screen_switches > 0 && (
                        <span className="yellow-card">
                          切屏{a.screen_switches}次
                        </span>
                      )}
                      {a.has_yellow_card && (
                        <span className="text-xs text-red-400 font-bold">黄牌</span>
                      )}
                      <span className={`text-xs ${a.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                        {a.is_correct ? '正确' : '错误'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)] text-center py-8">暂无答题数据</p>
              )}
            </div>

            {/* 每题正确率统计 */}
            <div className="glass-card p-5">
              <h3 className="font-bold mb-4">题目正确率</h3>
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                游戏进行中实时更新
              </p>
            </div>
          </div>
        )}

        {/* 排行榜 */}
        {tab === 'ranking' && (
          <div className="space-y-4">
            {room?.status === 'finished' ? (
              <>
                {/* 总排名 */}
                <div className="glass-card p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <span className="text-yellow-400">🏆</span> 总排名
                  </h3>
                  <div className="space-y-2">
                    {rankings.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[rgba(15,23,42,0.4)]">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
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
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{r.player?.nickname}</span>
                          <span className="text-xs text-[var(--text-secondary)] ml-1">({r.player?.real_name})</span>
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                          <span className="text-blue-400 font-bold">{r.final_score}分</span>
                          <span className="text-[var(--text-secondary)]">
                            {r.correct_count}✓{r.wrong_count}✗
                          </span>
                          <span className={`${r.accuracy_rate >= 80 ? 'text-green-400' : r.accuracy_rate >= 50 ? 'text-yellow-400' : 'text-red-400'} font-medium`}>
                            {r.accuracy_rate}%
                          </span>
                          {r.avg_time_ms != null && (
                            <span className="text-[var(--text-secondary)]">
                              {(r.avg_time_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                          {r.total_screen_switches > 0 && (
                            <span className="text-red-400">⚠{r.total_screen_switches}</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)]">
                            第{r.award_tier}等
                          </span>
                        </div>
                      </div>
                    ))}
                    {rankings.length === 0 && (
                      <p className="text-sm text-[var(--text-secondary)] text-center py-4">暂无数据</p>
                    )}
                  </div>
                </div>

                {/* 分组排名 */}
                <div className="grid md:grid-cols-2 gap-4">
                  {(['A', 'B'] as GroupLabel[]).map((g) => {
                    const groupR = rankings.filter(r => r.group_label === g);
                    return (
                      <div key={g} className="glass-card p-5">
                        <h3 className="font-bold mb-3 flex items-center gap-2">
                          <span className={`group-badge group-${g.toLowerCase()}`}>{g}</span>
                          {g}组排名
                        </h3>
                        <div className="space-y-1.5">
                          {groupR.map((r, i) => (
                            <div key={r.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(15,23,42,0.4)] text-sm">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)]'
                              }`}>{i + 1}</span>
                              <span className="flex-1 min-w-0">
                                <span className="font-medium">{r.player?.nickname}</span>
                              </span>
                              <span className="font-bold text-blue-400">{r.final_score}分</span>
                              <span className="text-xs text-[var(--text-secondary)]">{r.accuracy_rate}%</span>
                            </div>
                          ))}
                          {groupR.length === 0 && (
                            <p className="text-xs text-[var(--text-secondary)] text-center py-3">暂无数据</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* 实时排行 */
              <div className="glass-card p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="text-green-400">●</span> 实时总排名
                </h3>
                <div className="space-y-2">
                  {[...players]
                    .map(p => {
                      const totalQ = p.correct_count + p.wrong_count;
                      const accuracy = totalQ > 0 ? Math.round((p.correct_count / totalQ) * 100) : 0;
                      return { ...p, accuracy, totalQ };
                    })
                    .sort((a, b) => {
                      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
                      if (b.totalQ !== a.totalQ) return b.totalQ - a.totalQ;
                      return b.score - a.score;
                    })
                    .map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(15,23,42,0.4)]">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-[rgba(148,163,184,0.1)] text-[var(--text-secondary)]'
                        }`}>{i + 1}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                          p.group_label === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>{p.group_label}</span>
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{p.nickname}</span>
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                          <span className="text-blue-400 font-bold">{p.score}分</span>
                          <span className="text-[var(--text-secondary)]">{p.correct_count}✓{p.wrong_count}✗</span>
                          <span className={`${p.accuracy >= 80 ? 'text-green-400' : p.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'} font-medium`}>
                            {p.totalQ > 0 ? `${p.accuracy}%` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  {players.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)] text-center py-6">暂无玩家加入</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <GameAssistant roomId={roomId} mode="admin" />
    </main>
  );
}
