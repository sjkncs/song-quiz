'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface GameAssistantProps {
  roomId?: string;
  playerId?: string;
  mode?: 'player' | 'admin';
}

const PLAYER_QUICK = [
  '我排第几？',
  '我的正确率',
  'A组B组对比',
  '游戏规则',
  '给我提示',
  'Top5是谁？',
];

const ADMIN_QUICK = [
  '当前进度',
  'A组B组对比',
  'Top5',
  '切屏异常',
  '正确率分析',
  '节奏建议',
];

export default function GameAssistant({ roomId, playerId, mode = 'player' }: GameAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: mode === 'admin'
        ? '管理小Q就绪。问我进度、分组对比、Top5、切屏异常、正确率或节奏建议。'
        : '嗨！我是派对小Q。问我排名、分数、分组、提示、规则都可以。',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/game-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          room_id: roomId,
          player_id: playerId,
          mode,
        }),
      });

      const data = await res.json();
      const reply: Message = {
        role: 'assistant',
        content: data.reply || '抱歉，暂时无法回复。',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, reply]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '网络异常，请稍后重试。',
        timestamp: Date.now(),
      }]);
    }

    setLoading(false);
  }, [input, loading, messages, roomId, playerId, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickList = mode === 'player' ? PLAYER_QUICK : ADMIN_QUICK;

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
        style={{
          background: open
            ? 'rgba(30,41,59,0.9)'
            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* 聊天面板 */}
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 w-[340px] max-h-[75vh] flex flex-col rounded-2xl shadow-2xl border border-[rgba(148,163,184,0.15)] overflow-hidden"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* 头部 */}
          <div className="px-4 py-3 border-b border-[rgba(148,163,184,0.1)] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="white"/><circle cx="18" cy="16" r="3" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {mode === 'admin' ? '管理小Q' : '派对小Q'}
              </p>
              <p className="text-xs text-[#94a3b8]">
                {mode === 'admin' ? '数据分析 · 节奏建议' : '排名 · 规则 · 提示'}
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          </div>

          {/* 消息区 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ maxHeight: '48vh' }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-[rgba(30,41,59,0.8)] text-[#e2e8f0] rounded-bl-sm border border-[rgba(148,163,184,0.1)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[rgba(30,41,59,0.8)] rounded-2xl rounded-bl-sm px-3.5 py-2.5 border border-[rgba(148,163,184,0.1)]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 快捷问题 - 始终显示 */}
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {quickList.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs px-2.5 py-1.5 rounded-full bg-[rgba(59,130,246,0.1)] text-blue-400 border border-[rgba(59,130,246,0.2)] hover:bg-[rgba(59,130,246,0.2)] transition-colors active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>

          {/* 输入区 */}
          <div className="px-3 py-2.5 border-t border-[rgba(148,163,184,0.1)]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'admin' ? '问管理小Q...' : '问派对小Q...'}
                className="flex-1 bg-[rgba(30,41,59,0.6)] border border-[rgba(148,163,184,0.15)] rounded-xl px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-blue-500 placeholder:text-[#64748b]"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
