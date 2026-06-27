import { useState, useRef, useEffect } from 'react'
import {
  MessageCircle, X, Send, Loader2, Trash2,
  ChevronLeft, ChevronRight, Wifi, WifiOff, Bot,
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'

// ── AI types ──────────────────────────────────────────────────────────────────

interface SuggestedRoom {
  name: string
  pricePerNight: number
  dayRate?: number | null
  imageUrl?: string | null
  hotelId: string
}

interface AiMessage {
  role: 'user' | 'model'
  content: string
  suggestedRooms?: SuggestedRoom[]
}

// ── Human-chat types ───────────────────────────────────────────────────────────

interface ConversationItem {
  id: string
  bookingId: string
  hotelId: string
  hotelName: string
  lastMessageAt: string | null
  lastMessageContent: string | null
  unreadCount: number
}

// ── Tab ────────────────────────────────────────────────────────────────────────

type Tab = 'ai' | 'chat'

// ── Session helpers ────────────────────────────────────────────────────────────

const STORAGE_HISTORY = 'petcare_chat_history'
const STORAGE_OPEN    = 'petcare_chat_open'
const FALLBACK_IMG    = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

function getDynamicGreeting(): string {
  const currentUser = useAuthStore.getState().user
  const hour = new Date().getHours()
  let time = hour >= 5 && hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối'
  const name = currentUser?.fullName ? ` ${currentUser.fullName}` : ''
  return `Chúc${name} ${time} vui vẻ. Mình là trợ lý PetCare Hub. Bạn cần tư vấn gửi bé cưng nào ạ?`
}

// ── RoomCarousel ───────────────────────────────────────────────────────────────

const RoomCarousel = ({ rooms }: { rooms: SuggestedRoom[] }) => {
  const [idx, setIdx] = useState(0)
  const room = rooms[idx]
  if (!room) return null
  return (
    <div className="w-full bg-white rounded-2xl border border-[#f0e4de] overflow-hidden shadow-sm">
      <div className="relative">
        <img
          src={room.imageUrl || FALLBACK_IMG}
          alt={room.name}
          className="w-full h-[140px] object-cover"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
        />
        {rooms.length > 1 && (
          <>
            <button type="button" onClick={() => setIdx(i => (i - 1 + rooms.length) % rooms.length)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 shadow flex items-center justify-center">
              <ChevronLeft size={15} className="text-[#303330]" />
            </button>
            <button type="button" onClick={() => setIdx(i => (i + 1) % rooms.length)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 shadow flex items-center justify-center">
              <ChevronRight size={15} className="text-[#303330]" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {rooms.map((_, i) => (
                <button key={i} type="button" onClick={() => setIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-[13px] font-bold text-[#303330] leading-snug">{room.name}</p>
        <p className="text-[13px] font-bold text-[#a43e24]">{room.pricePerNight.toLocaleString('vi-VN')}đ/đêm</p>
        {room.dayRate != null && room.dayRate > 0 && (
          <p className="text-[10px] text-[#8a7e75]">Gửi ngày: {room.dayRate.toLocaleString('vi-VN')}đ</p>
        )}
      </div>
      <a href={`/hotels/${room.hotelId}`}
        className="block border-t border-[#f0e4de] px-2 py-2.5 text-center text-[12px] font-bold text-[#a43e24] hover:bg-[#fff5f0] transition-colors">
        Xem phòng →
      </a>
    </div>
  )
}

// ── ChatWidget ─────────────────────────────────────────────────────────────────

export const ChatWidget = () => {
  const user = useAuthStore(state => state.user)

  // ── widget open ──
  const [open, setOpen] = useState<boolean>(() => readSession<boolean>(STORAGE_OPEN, false))

  // ── tabs ──
  const [activeTab, setActiveTab] = useState<Tab>('ai')

  // ── AI state ──
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(() => {
    const h = readSession<AiMessage[]>(STORAGE_HISTORY, [])
    return h.length > 0 ? h : [{ role: 'model', content: getDynamicGreeting() }]
  })
  const [aiInput, setAiInput]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const aiBottomRef = useRef<HTMLDivElement>(null)
  const aiInputRef  = useRef<HTMLTextAreaElement>(null)

  // ── chat-panel state ──
  const [conversations, setConversations]     = useState<ConversationItem[]>([])
  const [convLoading, setConvLoading]         = useState(false)
  const [selectedConv, setSelectedConv]       = useState<ConversationItem | null>(null)
  const [chatMessages, setChatMessages]       = useState<MessageResponse[]>([])
  const [chatHistLoading, setChatHistLoading] = useState(false)
  const [chatInput, setChatInput]             = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef  = useRef<HTMLTextAreaElement>(null)

  // ── websocket ──
  const { status, connect, subscribe, sendMessage: wsSend, disconnect } = useChatSocket()

  // ── persist AI history ──
  useEffect(() => { writeSession(STORAGE_HISTORY, aiMessages) }, [aiMessages])
  useEffect(() => { writeSession(STORAGE_OPEN, open) }, [open])

  // ── AI scroll ──
  useEffect(() => { aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages, aiLoading])

  // ── AI focus on open ──
  useEffect(() => {
    if (open && activeTab === 'ai') {
      const t = setTimeout(() => aiInputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [open, activeTab])

  // ── update AI greeting when user logs in ──
  useEffect(() => {
    if (aiMessages.length === 1 && aiMessages[0].role === 'model') {
      const expected = getDynamicGreeting()
      if (aiMessages[0].content !== expected) setAiMessages([{ role: 'model', content: expected }])
    }
  }, [user, aiMessages.length])

  // ── load conversations when chat tab opens ──
  useEffect(() => {
    if (activeTab === 'chat' && user) loadConversations()
  }, [activeTab, user])

  // ── scroll chat to bottom ──
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  // ── connect socket when conversation is opened ──
  useEffect(() => {
    if (selectedConv) connect()
  }, [selectedConv, connect])

  // ── subscribe to conversation topic ──
  useEffect(() => {
    if (status !== 'connected' || !selectedConv) return
    return subscribe(selectedConv.id, msg => setChatMessages(prev => [...prev, msg]))
  }, [status, selectedConv?.id, subscribe])

  // ── disconnect socket when widget closes ──
  useEffect(() => {
    if (!open) disconnect()
  }, [open, disconnect])

  // ── focus chat input when conversation opens ──
  useEffect(() => {
    if (selectedConv && status === 'connected') {
      setTimeout(() => chatInputRef.current?.focus(), 150)
    }
  }, [selectedConv, status])

  // ── helpers: AI ──

  const clearAiHistory = () => {
    sessionStorage.removeItem(STORAGE_HISTORY)
    setAiMessages([{ role: 'model', content: getDynamicGreeting() }])
  }

  const sendAiMessage = async () => {
    const text = aiInput.trim()
    if (!text || aiLoading) return
    const userMsg: AiMessage = { role: 'user', content: text }
    const next = [...aiMessages, userMsg]
    setAiMessages(next)
    setAiInput('')
    setAiLoading(true)
    try {
      const res = await axiosInstance.post('/api/chat', { messages: next })
      setAiMessages([...next, { role: 'model', content: res.data.reply, suggestedRooms: res.data.suggestedRooms ?? [] }])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { reply?: string } } }
      setAiMessages([...next, { role: 'model', content: e?.response?.data?.reply ?? 'Mất kết nối, thử lại nhé' }])
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage() }
  }

  // ── helpers: chat ──

  const loadConversations = async () => {
    setConvLoading(true)
    try {
      const res = await axiosInstance.get<{ data: ConversationItem[] }>('/api/conversations/me')
      setConversations(res.data.data ?? [])
    } catch { /* ignore */ } finally {
      setConvLoading(false)
    }
  }

  const openConversation = async (conv: ConversationItem) => {
    setSelectedConv(conv)
    setChatMessages([])
    setChatHistLoading(true)
    try {
      const res = await axiosInstance.get<{ data: MessageResponse[] }>(`/api/conversations/${conv.id}/messages`)
      setChatMessages(res.data.data ?? [])
    } finally {
      setChatHistLoading(false)
    }
  }

  const goBack = () => {
    setSelectedConv(null)
    setChatMessages([])
    loadConversations()
  }

  const sendHumanMsg = () => {
    const content = chatInput.trim()
    if (!content || !selectedConv) return
    if (wsSend(selectedConv.id, content)) setChatInput('')
  }

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendHumanMsg() }
  }

  const fmtTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    if (diffDays < 7) return d.toLocaleDateString('vi-VN', { weekday: 'short' })
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const inConvView = activeTab === 'chat' && selectedConv !== null

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Đóng chat' : 'Mở chat'}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-[#a43e24] text-white
                   shadow-lg shadow-[#a43e24]/30 hover:scale-105 active:scale-95
                   transition-all duration-200 flex items-center justify-center"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>

      {/* ── Widget panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-[9998]
                    w-[360px] max-w-[calc(100vw-2rem)]
                    bg-white rounded-3xl shadow-2xl border border-[#f0e4de]
                    flex flex-col overflow-hidden
                    transition-all duration-300 origin-bottom-right
                    ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}
        style={{ height: 520 }}
      >
        {/* ── Header ── */}
        <div className="bg-[#a43e24] text-white shrink-0">

          {/* Title row */}
          <div className="flex items-center px-4 h-12 gap-2">
            {inConvView ? (
              <>
                <button onClick={goBack}
                  className="hover:bg-white/20 rounded-full p-1 transition-colors shrink-0"
                  aria-label="Quay lại">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{selectedConv.hotelName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {status === 'connected' ? (
                      <><Wifi size={9} className="text-white/80" /><span className="text-[9px] text-white/80">Đã kết nối</span></>
                    ) : status === 'connecting' ? (
                      <><Loader2 size={9} className="animate-spin text-white/80" /><span className="text-[9px] text-white/80">Đang kết nối...</span></>
                    ) : (
                      <><WifiOff size={9} className="text-white/60" /><span className="text-[9px] text-white/60">Mất kết nối</span></>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="flex-1 text-base font-bold tracking-wide">PetCare Hub</p>
            )}

            <div className="flex items-center gap-1 shrink-0">
              {activeTab === 'ai' && (
                <button onClick={clearAiHistory} title="Xóa hội thoại AI"
                  className="hover:bg-white/20 rounded-full p-1.5 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Đóng"
                className="hover:bg-white/20 rounded-full p-1.5 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab bar — ẩn khi đang trong cửa sổ chat cụ thể */}
          {!inConvView && (
            <div className="flex border-t border-white/20">
              {([
                { id: 'ai'   as Tab, icon: <Bot size={12}/>,            label: 'Trợ lý AI' },
                { id: 'chat' as Tab, icon: <MessageCircle size={12}/>,  label: 'Nhắn khách sạn', authOnly: true },
              ] as const).map(t => {
                if (t.authOnly && !user) return null
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all
                      ${activeTab === t.id ? 'bg-white/20' : 'hover:bg-white/10 text-white/70'}`}
                  >
                    {t.icon}{t.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-[#faf9f6]">

          {/* Tab: AI */}
          {activeTab === 'ai' && (
            <div className="px-3 py-3 flex flex-col gap-3 min-h-full">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[78%]
                    ${msg.role === 'model' && msg.suggestedRooms?.length ? 'w-full' : ''}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                      ${msg.role === 'model' && msg.suggestedRooms?.length ? 'w-full' : ''}
                      ${msg.role === 'user'
                        ? 'bg-[#a43e24] text-white rounded-tr-sm'
                        : 'bg-white text-[#303330] rounded-tl-sm border border-[#f0e4de]'}`}>
                      {msg.content}
                    </div>
                    {msg.role === 'model' && msg.suggestedRooms && msg.suggestedRooms.length > 0 && (
                      <RoomCarousel rooms={msg.suggestedRooms} />
                    )}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#f0e4de] px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
                    {[0, 150, 300].map((d, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#a43e24]/50 animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={aiBottomRef} />
            </div>
          )}

          {/* Tab: Chat — lớp 1: danh sách hội thoại */}
          {activeTab === 'chat' && !selectedConv && (
            <div className="flex flex-col">
              {convLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="animate-spin text-[#a43e24]" size={24} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                  <MessageCircle size={36} className="text-[#e5d8d0]" />
                  <p className="text-sm font-bold text-[#8a7e75]">Chưa có cuộc trò chuyện nào</p>
                  <p className="text-[11px] text-[#8a7e75] leading-relaxed">
                    Đặt phòng và nhắn khách sạn qua trang{' '}
                    <a href="/my-bookings" className="text-[#a43e24] font-bold underline">Lịch sử đặt phòng</a>.
                  </p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#f5ede8] transition-colors border-b border-[#f0e4de] text-left"
                  >
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 rounded-full bg-[#e5d8d0] flex items-center justify-center shrink-0">
                      <MessageCircle size={16} className="text-[#a43e24]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold text-[#303330] truncate">{conv.hotelName}</p>
                        <span className="text-[10px] text-[#8a7e75] shrink-0 ml-1">{fmtTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-[11px] text-[#8a7e75] truncate">
                        {conv.lastMessageContent ?? 'Bắt đầu cuộc trò chuyện...'}
                      </p>
                    </div>

                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#a43e24] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Tab: Chat — lớp 2: tin nhắn */}
          {activeTab === 'chat' && selectedConv && (
            <div className="px-4 py-4 flex flex-col gap-3 min-h-full">
              {chatHistLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-[#a43e24]" size={22} />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle size={28} className="text-[#e5d8d0] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#8a7e75]">Chưa có tin nhắn</p>
                  <p className="text-[10px] text-[#8a7e75] mt-1">Hãy bắt đầu trò chuyện!</p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const mine = msg.senderRole === 'OWNER'
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-wide ${mine ? 'text-[#a43e24]' : 'text-[#44683b]'}`}>
                          {mine ? 'Bạn' : 'Nhân viên khách sạn'}
                        </span>
                        <div className={`px-3.5 py-2.5 text-xs leading-relaxed ${
                          mine
                            ? 'bg-[#a43e24] text-white rounded-2xl rounded-br-sm'
                            : 'bg-white text-[#303330] border border-[#e5d8d0] rounded-2xl rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-[#8a7e75]">
                          {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* ── Footer / Input ── */}

        {/* AI input */}
        {activeTab === 'ai' && (
          <div className="shrink-0 border-t border-[#f0e4de] px-3 py-3 bg-white flex gap-2 items-end">
            <textarea
              ref={aiInputRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={handleAiKey}
              placeholder="Enter để gửi..."
              rows={1}
              disabled={aiLoading}
              className="flex-1 border border-[#e1e3df] rounded-2xl px-3 py-2 text-sm outline-none
                         focus:border-[#a43e24] resize-none leading-relaxed max-h-[72px] disabled:opacity-50"
            />
            <button
              onClick={sendAiMessage}
              disabled={!aiInput.trim() || aiLoading}
              className="w-9 h-9 rounded-full bg-[#a43e24] text-white flex items-center justify-center
                         hover:opacity-90 active:scale-95 transition-all disabled:opacity-35 shrink-0"
              aria-label="Gửi">
              {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        )}

        {/* Human-chat input (only in layer 2) */}
        {activeTab === 'chat' && selectedConv && (
          <div className="shrink-0 border-t border-[#f0e4de] px-3 py-3 bg-white flex gap-2 items-end">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
              placeholder={status === 'connected' ? 'Nhắn tin...' : 'Đang kết nối...'}
              rows={1}
              disabled={status !== 'connected'}
              className="flex-1 border border-[#e1e3df] rounded-2xl px-3 py-2 text-sm outline-none
                         focus:border-[#a43e24] resize-none leading-relaxed max-h-[72px] disabled:opacity-50"
            />
            <button
              onClick={sendHumanMsg}
              disabled={!chatInput.trim() || status !== 'connected'}
              className="w-9 h-9 rounded-full bg-[#a43e24] text-white flex items-center justify-center
                         hover:opacity-90 active:scale-95 transition-all disabled:opacity-35 shrink-0"
              aria-label="Gửi">
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
