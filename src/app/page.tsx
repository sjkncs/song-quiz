'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAnonymously, getCurrentUser } from '@/app/game-actions';

export default function HomePage() {
  const router = useRouter();
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [roomHistory, setRoomHistory] = useState<{ code: string; name?: string; isAdmin: boolean; realName: string; nickname: string; joinedAt: string }[]>([]);

  // 检查已加入的房间历史（用于快速重连）
  useEffect(() => {
    const saved = localStorage.getItem('room_history');
    if (saved) {
      try { setRoomHistory(JSON.parse(saved)); } catch {}
    }
    // 兼容旧版 last_room 数据
    const legacy = localStorage.getItem('last_room');
    if (legacy && !saved) {
      try {
        const old = JSON.parse(legacy);
        const migrated = [{ ...old, joinedAt: new Date().toISOString() }];
        setRoomHistory(migrated);
        localStorage.setItem('room_history', JSON.stringify(migrated));
      } catch {}
    }
  }, []);

  const storeUserInfo = () => {
    sessionStorage.setItem('real_name', realName.trim());
    sessionStorage.setItem('nickname', nickname.trim());
    // 追加到房间历史（去重，保留最新的）
    const entry = {
      code: roomCode.trim().toUpperCase(),
      isAdmin,
      realName: realName.trim(),
      nickname: nickname.trim(),
      joinedAt: new Date().toISOString(),
    };
    setRoomHistory(prev => {
      const filtered = prev.filter(r => r.code !== entry.code);
      const updated = [entry, ...filtered].slice(0, 10); // 最多保存10个
      localStorage.setItem('room_history', JSON.stringify(updated));
      return updated;
    });
  };

  // 快速返回指定房间
  const handleReconnect = async (roomEntry: typeof roomHistory[0]) => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        await signInAnonymously(roomEntry.nickname);
      }
      sessionStorage.setItem('real_name', roomEntry.realName);
      sessionStorage.setItem('nickname', roomEntry.nickname);
      if (roomEntry.isAdmin) {
        sessionStorage.setItem('is_admin', 'true');
        sessionStorage.setItem('room_code', roomEntry.code);
        router.push('/admin');
      } else {
        router.push(`/game/${roomEntry.code}`);
      }
    } catch {
      setError('重连失败，请重新登录');
    }
    setLoading(false);
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
    if (!roomCode.trim() || roomCode.trim().length < 4) { setError('请输入有效的房间码'); return; }
    setLoading(true);
    setError('');
    try {
      await signInAnonymously(nickname.trim());
      storeUserInfo();
      sessionStorage.setItem('is_admin', 'true');
      sessionStorage.setItem('room_code', roomCode.trim().toUpperCase());
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
          脑力派对
        </h1>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          音乐影视知识对战 - 多人组队PK
        </p>
      </div>

      {/* 已加入的房间列表 */}
      {roomHistory.length > 0 && (
        <div className="w-full max-w-sm mb-4 animate-slideUp">
          <p className="text-xs text-[var(--text-secondary)] mb-2 px-1">我的房间</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {roomHistory.map((r, i) => (
              <div
                key={r.code + i}
                className="glass-card p-3 flex items-center gap-3 cursor-pointer hover:border-blue-500/30 transition-all"
                onClick={() => handleReconnect(r)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  r.isAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {r.isAdmin ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-blue-400 tracking-widest">{r.code}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {r.isAdmin ? '主持人' : '玩家'} · {r.nickname}
                  </p>
                </div>
                <span className="text-xs text-blue-400 flex-shrink-0">进入 →</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

        {/* 房间码 */}
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
            {isAdmin ? '设定房间码' : '房间码'}
          </label>
          <input
            type="text"
            className="input-field text-center text-2xl tracking-[0.3em] font-mono uppercase"
            placeholder={isAdmin ? '如 0723PK' : 'ABC123'}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            maxLength={8}
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 text-center">
            {isAdmin
              ? '4-8位字母数字，设定后告知玩家'
              : '输入主持人提供的房间码'}
          </p>
        </div>

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
