'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInAnonymously } from '@/app/game-actions';

export default function HomePage() {
  const router = useRouter();
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const storeUserInfo = () => {
    sessionStorage.setItem('real_name', realName.trim());
    sessionStorage.setItem('nickname', nickname.trim());
  };

  // 玩家加入
  const handleJoin = async () => {
    if (!realName.trim()) { setError('请输入真实姓名'); return; }
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    if (!roomCode.trim() || roomCode.trim().length < 4) { setError('请输入有效的房间码'); return; }
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(nickname.trim());
      storeUserInfo();
      router.push(`/game/${roomCode.trim().toUpperCase()}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加入失败');
    }
    setLoading(false);
  };

  // 主持人直接进入后台
  const handleAdmin = async () => {
    if (!realName.trim()) { setError('请输入真实姓名'); return; }
    if (!nickname.trim()) { setError('请输入昵称'); return; }
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(nickname.trim());
      storeUserInfo();
      sessionStorage.setItem('is_admin', 'true');
      router.push('/admin');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登录失败');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo区域 */}
      <div className="text-center mb-10 animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          猜歌王 PK
        </h1>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          音乐知识竞赛 - 双人组队PK
        </p>
      </div>

      {/* 登录卡片 */}
      <div className="glass-card w-full max-w-sm p-6 space-y-5 animate-slideUp">
        {/* 模式切换 */}
        <div className="flex bg-[rgba(15,23,42,0.6)] rounded-xl p-1">
          <button
            onClick={() => setIsAdmin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !isAdmin ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)]'
            }`}
          >
            玩家入口
          </button>
          <button
            onClick={() => setIsAdmin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isAdmin ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)]'
            }`}
          >
            主持人入口
          </button>
        </div>

        {/* 真实姓名 */}
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            真实姓名{isAdmin ? '' : '（仅管理员可见）'}
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="输入你的真实姓名"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* 昵称 */}
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">昵称（排行榜显示）</label>
          <input
            type="text"
            className="input-field"
            placeholder="输入昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* 房间码（仅玩家） */}
        {!isAdmin && (
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">房间码</label>
            <input
              type="text"
              className="input-field text-center text-2xl tracking-[0.3em] font-mono uppercase"
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              maxLength={8}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 text-center">
              输入主持人提供的房间码
            </p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-red-400 text-center animate-shake">{error}</p>
        )}

        {/* 提交按钮 */}
        <button
          onClick={isAdmin ? handleAdmin : handleJoin}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? '处理中...' : isAdmin ? '进入管理后台' : '加入游戏'}
        </button>
      </div>

      {/* 底部说明 */}
      <p className="mt-8 text-xs text-[var(--text-secondary)] text-center max-w-xs">
        输入相同房间码的玩家进入同一场游戏。游戏过程中请勿切换至其他应用，否则将被记录。
      </p>
    </main>
  );
}
