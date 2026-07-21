'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type {
  GameRoom, GamePlayer, GameRound, GameQuestion,
  GameBroadcast, GroupLabel
} from '@/types/game';

interface UseGameRealtimeOptions {
  roomId: string;
  onBroadcast?: (msg: GameBroadcast) => void;
  onRoomUpdate?: (room: GameRoom) => void;
  onPlayerUpdate?: (players: GamePlayer[]) => void;
  onRoundUpdate?: (round: GameRound & { question?: GameQuestion }) => void;
  subscribeToPlayers?: boolean; // 默认 true，player 端设为 false 避免订阅风暴
}

export function useGameRealtime(options: UseGameRealtimeOptions) {
  const { roomId, onBroadcast, onRoomUpdate, onPlayerUpdate, onRoundUpdate, subscribeToPlayers = true } = options;
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [connected, setConnected] = useState(false);

  // 用 ref 保存最新回调，避免闭包陈旧
  const onBroadcastRef = useRef(onBroadcast);
  const onRoomUpdateRef = useRef(onRoomUpdate);
  const onPlayerUpdateRef = useRef(onPlayerUpdate);
  const onRoundUpdateRef = useRef(onRoundUpdate);
  // 每次渲染更新 ref
  onBroadcastRef.current = onBroadcast;
  onRoomUpdateRef.current = onRoomUpdate;
  onPlayerUpdateRef.current = onPlayerUpdate;
  onRoundUpdateRef.current = onRoundUpdate;

  // 订阅 Broadcast 频道
  useEffect(() => {
    const channel = supabase.channel(`game:${roomId}`);
    broadcastChannelRef.current = channel;

    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      const msg = payload as unknown as GameBroadcast;
      onBroadcastRef.current?.(msg);
    });

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [roomId]);

  // 订阅数据库变更（Realtime）
  useEffect(() => {
    const dbChannel = supabase.channel(`db:${roomId}`);

    dbChannel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          onRoomUpdateRef.current?.(payload.new as GameRoom);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rounds', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const roundData = payload.new as GameRound;
          if (roundData.question_id) {
            const { data: question } = await supabase
              .from('game_questions')
              .select('*')
              .eq('id', roundData.question_id)
              .single();
            onRoundUpdateRef.current?.({ ...roundData, question: question as GameQuestion });
          } else {
            onRoundUpdateRef.current?.(roundData);
          }
        }
      );

    // 仅管理端订阅玩家变更，避免 N 个玩家客户端产生 O(N²) 订阅风暴
    if (subscribeToPlayers) {
      dbChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase
            .from('game_players')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true });
          if (data) onPlayerUpdateRef.current?.(data as GamePlayer[]);
        }
      );
    }

    dbChannel.subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
    };
  }, [roomId]);

  // 发送广播消息（使用已订阅的频道）
  const broadcast = useCallback(async (msg: Omit<GameBroadcast, 'timestamp'>) => {
    if (!broadcastChannelRef.current) {
      console.warn('Broadcast channel not ready');
      return;
    }
    await broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'game_event',
      payload: { ...msg, timestamp: Date.now() },
    });
  }, []);

  return { broadcast, connected };
}

// ============================================================
// 反作弊 - 切屏检测 Hook
// ============================================================

export function useAntiCheat() {
  const switchCount = useRef(0);
  const [switches, setSwitches] = useState(0);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        switchCount.current += 1;
        setSwitches(switchCount.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const reset = useCallback(() => {
    switchCount.current = 0;
    setSwitches(0);
  }, []);

  return { screenSwitches: switches, reset };
}

// ============================================================
// 倒计时 Hook
// ============================================================

export function useCountdown(totalSeconds: number, active: boolean) {
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeRemaining(totalSeconds);
      return;
    }

    setTimeRemaining(totalSeconds);
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totalSeconds, active]);

  return timeRemaining;
}

// ============================================================
// 答题计时 Hook
// ============================================================

export function useAnswerTimer() {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = Date.now();
  }, []);

  const getElapsed = useCallback(() => {
    return Date.now() - startTime.current;
  }, []);

  const reset = useCallback(() => {
    startTime.current = 0;
  }, []);

  return { start, getElapsed, reset };
}
