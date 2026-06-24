import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Trash2 } from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface SuggestedRoom {
  name: string
  pricePerNight: number
  dayRate?: number | null
  imageUrl?: string | null
  hotelId: string
}

interface Message {
  role: 'user' | 'model'
  content: string
  suggestedRooms?: SuggestedRoom[]
}

const STORAGE_HISTORY = 'petcare_chat_history'
const STORAGE_OPEN    = 'petcare_chat_open'

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'

const GREETING: Message = {
  role: 'model',
  content: 'Chào bạn! Mình là trợ lý PetCare Hub. Bạn cần tư vấn gửi bé cưng nào ạ? 🐶',
}

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota lỗi thì bỏ qua */ }
}

export const ChatWidget = () => {
  // Khởi tạo từ sessionStorage — lazy initializer chạy đúng 1 lần
  const [open, setOpen] = useState<boolean>(() =>
    readSession<boolean>(STORAGE_OPEN, false)
  )
  const [messages, setMessages] = useState<Message[]>(() =>
    readSession<Message[]>(STORAGE_HISTORY, [GREETING])
  )
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Lưu messages vào sessionStorage mỗi khi thay đổi
  useEffect(() => {
    writeSession(STORAGE_HISTORY, messages)
  }, [messages])

  // Lưu trạng thái mở/đóng
  useEffect(() => {
    writeSession(STORAGE_OPEN, open)
  }, [open])

  // Cuộn xuống tin mới nhất
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [open])

  const clearHistory = () => {
    sessionStorage.removeItem(STORAGE_HISTORY)
    sessionStorage.removeItem(STORAGE_OPEN)
    setMessages([GREETING])
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await axiosInstance.post('/api/chat', { messages: next })
      setMessages([...next, {
        role: 'model',
        content: res.data.reply,
        suggestedRooms: res.data.suggestedRooms ?? [],
      }])
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { reply?: string } } }
      const reply  = errAny?.response?.data?.reply ?? 'Mất kết nối, thử lại nhé 🐾'
      setMessages([...next, { role: 'model', content: reply }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Nút nổi ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Đóng chat' : 'Tư vấn với trợ lý'}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[#a43e24] text-white
                   shadow-lg shadow-[#a43e24]/30 hover:scale-105 active:scale-95
                   transition-all duration-200 flex items-center justify-center"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>

      {/* ── Khung chat ── */}
      <div
        className={`fixed bottom-24 right-6 z-[9998]
                    w-[360px] max-w-[calc(100vw-2rem)]
                    bg-white rounded-3xl shadow-2xl border border-[#f0e4de]
                    flex flex-col overflow-hidden
                    transition-all duration-300 origin-bottom-right
                    ${open
                      ? 'opacity-100 scale-100 pointer-events-auto'
                      : 'opacity-0 scale-90 pointer-events-none'
                    }`}
        style={{ height: 500 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#a43e24] text-white shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Trợ lý PetCare 🐾</p>
            <p className="text-[10px] text-white/65 mt-0.5">Tư vấn chọn phòng · Không tự đặt</p>
          </div>

          {/* Xóa hội thoại */}
          <button
            onClick={clearHistory}
            title="Xóa hội thoại"
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            aria-label="Xóa hội thoại"
          >
            <Trash2 size={15} />
          </button>

          {/* Đóng */}
          <button
            onClick={() => setOpen(false)}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vùng tin nhắn */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 bg-[#faf9f6]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'model'
                  ? 'bg-[#feeadb] text-[#a43e24]'
                  : 'bg-[#a43e24] text-white'
              }`}>
                {msg.role === 'model' ? <Bot size={13} /> : <User size={13} />}
              </div>

              {/* Bong bóng + thẻ phòng */}
              <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[78%]`}>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-[#a43e24] text-white rounded-tr-sm'
                    : 'bg-white text-[#303330] rounded-tl-sm border border-[#f0e4de]'
                }`}>
                  {msg.content}
                </div>

                {/* Thẻ phòng gợi ý */}
                {msg.role === 'model' &&
                  msg.suggestedRooms &&
                  msg.suggestedRooms.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 w-full scroll-smooth">
                    {msg.suggestedRooms.map((room, j) => (
                      <a
                        key={j}
                        href={`/hotels/${room.hotelId}`}
                        className="min-w-[138px] max-w-[138px] bg-white rounded-2xl border border-[#f0e4de]
                                   overflow-hidden shadow-sm flex flex-col shrink-0
                                   hover:shadow-md hover:border-[#a43e24]/40 transition-all"
                      >
                        <img
                          src={room.imageUrl || FALLBACK_IMG}
                          alt={room.name}
                          className="w-full h-[72px] object-cover"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = FALLBACK_IMG
                          }}
                        />
                        <div className="p-2 flex flex-col gap-0.5 flex-1">
                          <p className="text-[11px] font-bold text-[#303330] line-clamp-2 leading-tight">
                            {room.name}
                          </p>
                          <p className="text-[11px] font-semibold text-[#a43e24]">
                            {room.pricePerNight.toLocaleString('vi-VN')}đ/đêm
                          </p>
                          {room.dayRate != null && room.dayRate > 0 && (
                            <p className="text-[9px] text-[#8a7e75]">
                              Gửi ngày: {room.dayRate.toLocaleString('vi-VN')}đ
                            </p>
                          )}
                        </div>
                        <div className="border-t border-[#f0e4de] px-2 py-1.5 text-center
                                        text-[10px] font-bold text-[#a43e24]
                                        hover:bg-[#fff5f0] transition-colors">
                          Xem phòng →
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#feeadb] text-[#a43e24] flex items-center justify-center shrink-0">
                <Bot size={13} />
              </div>
              <div className="bg-white border border-[#f0e4de] px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
                {[0, 150, 300].map((delay, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#a43e24]/50 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-[#f0e4de] px-3 py-3 bg-white flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập câu hỏi... (Enter để gửi)"
            rows={1}
            disabled={loading}
            className="flex-1 border border-[#e1e3df] rounded-2xl px-3 py-2 text-sm outline-none
                       focus:border-[#a43e24] resize-none leading-relaxed
                       max-h-[72px] disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-[#a43e24] text-white flex items-center justify-center
                       hover:opacity-90 active:scale-95 transition-all disabled:opacity-35 shrink-0"
            aria-label="Gửi"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
      </div>
    </>
  )
}
