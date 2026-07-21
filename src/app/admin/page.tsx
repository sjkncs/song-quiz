'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, getCurrentUser, getRoomByCode } from '@/app/game-actions';
import type { GameRoom } from '@/types/game';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      // 检查登录状态
      const user = await getCurrentUser();
      if (!user) {
        router.push('/');
        return;
      }

      // 尝试获取已存在的房间
      const roomCode = sessionStorage.getItem('room_code');
      if (roomCode) {
        try {
          const r = await getRoomByCode(roomCode);
          // 检查是否是当前用户创建的
          if (r.host_user_id === user.id) {
            setRoom(r);
            setLoading(false);
            return;
          }
        } catch {
          // 房间不存在，继续显示创建界面
        }
      }
      setLoading(false);
    })();
  }, [router]);

  const handleCreateRoom = async () => {
    const roomCode = sessionStorage.getItem('room_code');
    if (!roomCode) {
      setError('请先返回首页设置房间码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await createRoom('音乐竞猜PK', roomCode);
      setRoom(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">加载中...</div>
      </main>
    );
  }

  // 已创建房间 -> 显示房间信息和QR码
  if (room) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const qrUrl = `${baseUrl}/game/${room.room_code}`;

    return (
      <main className="min-h-[100dvh] px-4 py-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">管理后台</h1>
            <p className="text-sm text-[var(--text-secondary)]">房间已就绪</p>
          </div>
          <button
            onClick={() => router.push(`/admin/room/${room.id}`)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            进入控制台
          </button>
        </div>

        <div className="glass-card p-6 mb-6">
          <h3 className="font-bold mb-4">房间信息</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">房间码</p>
              <p className="text-3xl font-mono font-bold text-blue-400 tracking-widest mt-1">
                {room.room_code}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">状态</p>
              <p className="text-lg mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  room.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                  room.status === 'playing' ? 'bg-green-500/20 text-green-400' :
                  room.status === 'finished' ? 'bg-gray-500/20 text-gray-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {room.status === 'waiting' ? '等待中' :
                   room.status === 'playing' ? '进行中' :
                   room.status === 'finished' ? '已结束' : '准备中'}
                </span>
              </p>
            </div>
          </div>

          {/* QR码 */}
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] mb-3">扫码加入游戏</p>
            <div className="inline-block bg-white p-4 rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-3 font-mono break-all">
              {qrUrl}
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/admin/room/${room.id}`)}
          className="btn-primary"
        >
          进入游戏控制台
        </button>
      </main>
    );
  }

  // 未创建房间
  const roomCode = sessionStorage.getItem('room_code') || '';

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12">
      <div className="glass-card w-full max-w-sm p-8 text-center animate-slideUp">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">管理后台</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          创建游戏房间，控制游戏流程
        </p>

        {roomCode && (
          <div className="mb-4">
            <p className="text-xs text-[var(--text-secondary)]">房间码</p>
            <p className="text-2xl font-mono font-bold text-blue-400 tracking-widest mt-1">
              {roomCode}
            </p>
          </div>
        )}

        {!roomCode && (
          <p className="text-sm text-red-400 mb-4">
            请先返回首页设置房间码
          </p>
        )}

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleCreateRoom}
          disabled={loading || !roomCode}
          className="btn-primary"
        >
          {loading ? '创建中...' : '创建房间'}
        </button>

        <button
          onClick={() => router.push('/')}
          className="btn-secondary mt-3"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          返回首页
        </button>
      </div>
    </main>
  );
}
