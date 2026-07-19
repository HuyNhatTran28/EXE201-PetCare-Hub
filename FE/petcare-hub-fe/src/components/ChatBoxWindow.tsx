import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Minus, Phone, Video, Send, Loader2, User, Wifi, WifiOff,
  Image, Paperclip, Smile, ThumbsUp
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'
import { useAuthStore } from '@/store/authStore'

interface ChatBoxWindowProps {
  conversationId: string
  bookingId: string
  onClose: () => void
  rightOffset: number
}

export const ChatBoxWindow = ({ conversationId, bookingId, onClose, rightOffset }: ChatBoxWindowProps) => {
  const { user } = useAuthStore()
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')

  const [bookingStatus, setBookingStatus] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { status, connect, subscribe, sendMessage, disconnect } = useChatSocket()

  // ── Load booking details to check status ──────────────────────────────────
  useEffect(() => {
    if (!bookingId) return
    axiosInstance.get(`/api/bookings/${bookingId}`)
      .then(res => {
        setBookingStatus(res.data.status)
      })
      .catch(err => {
        console.error('Không thể tải thông tin đặt phòng trong ChatBox:', err)
      })
  }, [bookingId])

  // ── Load initial messages ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    axiosInstance
      .get<{ data: MessageResponse[] }>(`/api/conversations/${conversationId}/messages`)
      .then(res => setMessages(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conversationId])

  // ── STOMP Socket connection ───────────────────────────────────────────────
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // ── Subscribe to incoming messages ────────────────────────────────────────
  useEffect(() => {
    if (status !== 'connected') return
    const unsub = subscribe(conversationId, (msg) => {
      setMessages(prev => [...prev, msg])
    })
    return () => unsub()
  }, [status, conversationId, subscribe])

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, minimized])

  // ── Send text message ─────────────────────────────────────────────────────
  const handleSend = () => {
    const content = input.trim()
    if (!content || status !== 'connected') return
    if (sendMessage(conversationId, content)) {
      setInput('')
      inputRef.current?.focus()
    }
  }

  // ── Send quick ThumbsUp like ──────────────────────────────────────────────
  const handleSendLike = () => {
    if (status !== 'connected') return
    sendMessage(conversationId, '👍')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="fixed bottom-0 z-50 bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] border-l border-r border-t border-[#e5d8d0] flex flex-col transition-all duration-200"
      style={{
        width: '328px',
        height: minimized ? '44px' : '455px',
        right: `${rightOffset}px`,
      }}
    >
      {/* Header bar */}
      <div 
        onClick={() => setMinimized(!minimized)}
        className="h-11 border-b border-[#e5d8d0] px-3 flex items-center justify-between bg-white rounded-t-2xl cursor-pointer shrink-0 select-none hover:bg-[#faf9f6]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#a43e24]/10 flex items-center justify-center shrink-0">
            <User size={12} className="text-[#a43e24]" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs text-[#050505] truncate">
              Booking #{bookingId.substring(0, 8).toUpperCase()}
            </h4>
            {!minimized && (
              <span className="text-[9px] text-emerald-600 font-bold block leading-none">
                Đang hoạt động
              </span>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#0064e0] cursor-pointer" title="Gọi thoại">
            <Phone size={13} />
          </button>
          <button className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#0064e0] cursor-pointer" title="Chat video">
            <Video size={13} />
          </button>
          <button 
            onClick={() => setMinimized(!minimized)}
            className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#5a5550] cursor-pointer" 
            title={minimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            <Minus size={13} />
          </button>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#5a5550] cursor-pointer" 
            title="Đóng chat"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Chat pane (hidden when minimized) */}
      {!minimized && (
        <>
          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#faf9f6]/30">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={18} className="animate-spin text-[#fa7150]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-[#fa7150]/10 flex items-center justify-center mx-auto mb-2">
                  <User size={20} className="text-[#fa7150]" />
                </div>
                <p className="text-[11px] font-bold text-[#8a7e75]">Chưa có tin nhắn nào</p>
                <p className="text-[9px] text-[#8a7e75]/70 mt-0.5">Bắt đầu cuộc trò chuyện với chủ nuôi</p>
              </div>
            ) : (
              messages.map(msg => {
                const mine = msg.senderRole === 'STAFF'
                const isThumbsUp = msg.content === '👍'

                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                      {isThumbsUp ? (
                        <span className="text-2xl select-none leading-none py-1">👍</span>
                      ) : (
                        <div className={`px-3 py-1.5 text-xs leading-relaxed ${
                          mine
                            ? 'bg-[#0084ff] text-white rounded-2xl rounded-br-sm shadow-sm'
                            : 'bg-[#e4e6eb] text-[#050505] rounded-2xl rounded-bl-sm shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <span className="text-[8px] text-[#8a7e75] px-1">
                        {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Action strip & Input bar (LOCKED if completed or cancelled) */}
          {bookingStatus === 'COMPLETED' || bookingStatus === 'CANCELLED' ? (
            <div className="px-4 py-3 bg-[#faf9f6] border-t border-[#e5d8d0] text-center text-[10px] text-[#8a7e75] font-bold select-none leading-relaxed shrink-0">
              🔒 Lượt lưu trú này đã {bookingStatus === 'COMPLETED' ? 'hoàn thành' : 'bị hủy'}. Cuộc hội thoại đã được đóng lại theo điều khoản hệ thống.
            </div>
          ) : (
            <div className="px-2 py-2 border-t border-[#e5d8d0] bg-white flex items-center gap-1.5 shrink-0">
              {/* Quick action buttons */}
              <div className="flex items-center gap-0.5 text-[#0084ff]">
                <button className="p-1 rounded-full hover:bg-[#f0f2f5] cursor-pointer" title="Đính kèm ảnh">
                  <Image size={15} />
                </button>
                <button className="p-1 rounded-full hover:bg-[#f0f2f5] cursor-pointer" title="Đính kèm file">
                  <Paperclip size={15} />
                </button>
                <button className="p-1 rounded-full hover:bg-[#f0f2f5] cursor-pointer" title="Chọn sticker">
                  <Smile size={15} />
                </button>
              </div>

              {/* Aa Text Input Box */}
              <div className="flex-grow relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Aa"
                  className="w-full bg-[#f0f2f5] rounded-full py-1.5 px-3.5 text-xs outline-none focus:bg-[#e4e6eb] transition-colors text-[#050505] placeholder:text-[#8a7e75]"
                />
              </div>

              {/* Send / Like button */}
              <div className="shrink-0">
                {input.trim() ? (
                  <button
                    onClick={handleSend}
                    className="p-1.5 rounded-full text-[#0084ff] hover:bg-[#f0f2f5] cursor-pointer transition-all active:scale-90"
                  >
                    <Send size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleSendLike}
                    className="p-1.5 rounded-full text-[#0084ff] hover:bg-[#f0f2f5] cursor-pointer transition-all active:scale-90"
                  >
                    <ThumbsUp size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
