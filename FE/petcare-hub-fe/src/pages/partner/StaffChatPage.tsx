import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Loader2, User, Wifi, WifiOff, Building } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'

interface ConversationItem {
  id: string
  bookingId: string
  petOwnerId: string
  hotelId: string
  lastMessageAt: string | null
  lastMessageContent: string | null
  unreadCount: number
}

interface HotelOption {
  id: string
  name: string
}

const formatTime = (iso: string): string => {
  const date = new Date(iso)
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffMins < 1440) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

const sortByRecent = (list: ConversationItem[]): ConversationItem[] =>
  [...list].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return tb - ta
  })

export const StaffChatPage = () => {
  const { user } = useAuthStore()
  const isPartner = user?.role === 'PARTNER'
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const queryConvId = searchParams.get('convId')

  const [hotels, setHotels]               = useState<HotelOption[]>([])
  const [hotelsLoading, setHotelsLoading] = useState(false)
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [messages, setMessages]           = useState<MessageResponse[]>([])
  const [messagesLoading, setMsgLoading]  = useState(false)
  const [input, setInput]                 = useState('')

  const { status, connect, subscribe, sendMessage, disconnect } = useChatSocket()

  const selectedIdRef = useRef<string | null>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)

  // ── Load hotels (PARTNER only) ────────────────────────────────────────────
  useEffect(() => {
    if (!isPartner) return
    setHotelsLoading(true)
    axiosInstance
      .get('/api/hotels/my', { params: { page: 0, size: 20, sort: [] } })
      .then(res => {
        const list: HotelOption[] = (res.data.content ?? []).map((h: HotelOption) => ({
          id: h.id,
          name: h.name,
        }))
        setHotels(list)
        if (list.length > 0) setSelectedHotelId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setHotelsLoading(false))
  }, [isPartner])

  // ── Load conversation list ────────────────────────────────────────────────
  useEffect(() => {
    if (isPartner && !selectedHotelId) {
      // wait for hotel to be selected (hotels still loading or none)
      if (!hotelsLoading) setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setConversations([])
    setSelectedId(null)
    selectedIdRef.current = null
    setMessages([])

    const params = isPartner && selectedHotelId ? { hotelId: selectedHotelId } : undefined
    const url = `/api/conversations/hotel${params ? `?hotelId=${params.hotelId}` : ''}`
    console.log('[StaffChatPage] fetching conversations:', url)
    axiosInstance
      .get<{ data: ConversationItem[] }>('/api/conversations/hotel', { params })
      .then(res => setConversations(sortByRecent(res.data.data ?? [])))
      .catch(err => setError(err.response?.data?.message ?? 'Không thể tải danh sách hội thoại.'))
      .finally(() => setLoading(false))
  }, [isPartner, selectedHotelId])

  // ── STOMP connect / disconnect ────────────────────────────────────────────
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // ── Stable incoming-message handler (uses refs → no stale closure) ────────
  const handleIncoming = useCallback((convId: string, msg: MessageResponse) => {
    if (selectedIdRef.current === convId) {
      setMessages(prev => [...prev, msg])
    } else {
      setConversations(prev =>
        sortByRecent(
          prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  unreadCount: (c.unreadCount ?? 0) + 1,
                  lastMessageContent: msg.content,
                  lastMessageAt: msg.sentAt,
                }
              : c
          )
        )
      )
    }
  }, [])

  // ── Subscribe to every conversation when STOMP is connected ───────────────
  const convIdsKey = conversations.map(c => c.id).join(',')
  useEffect(() => {
    if (status !== 'connected' || !convIdsKey) return
    const ids  = convIdsKey.split(',').filter(Boolean)
    const unsubs = ids.map(id => subscribe(id, msg => handleIncoming(id, msg)))
    return () => unsubs.forEach(fn => fn())
  }, [status, convIdsKey, subscribe, handleIncoming])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Select a conversation ─────────────────────────────────────────────────
  const selectConversation = useCallback(async (conv: ConversationItem) => {
    if (selectedIdRef.current === conv.id) return
    setSelectedId(conv.id)
    selectedIdRef.current = conv.id
    setMessages([])
    setInput('')
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c))

    setMsgLoading(true)
    try {
      const res = await axiosInstance.get<{ data: MessageResponse[] }>(
        `/api/conversations/${conv.id}/messages`
      )
      if (selectedIdRef.current === conv.id) {
        setMessages(res.data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setMsgLoading(false)
    }
  }, [])

  // Auto-select conversation if queryConvId is present in URL parameters
  useEffect(() => {
    if (queryConvId && conversations.length > 0) {
      const match = conversations.find(c => c.id === queryConvId)
      if (match) {
        selectConversation(match)
      }
    }
  }, [queryConvId, conversations, selectConversation])

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = () => {
    const content = input.trim()
    if (!content || !selectedId || status !== 'connected') return
    if (sendMessage(selectedId, content)) {
      setInput('')
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedConv  = conversations.find(c => c.id === selectedId)
  const totalUnread   = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── PARTNER: Hotel selector ──────────────────────────────────────── */}
      {isPartner && (
        <div className="flex items-center gap-4 bg-white border-b border-[#e5d8d0] px-6 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Building size={16} className="text-[#fa7150]" />
            <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Chọn cơ sở:</span>
            {hotelsLoading ? (
              <Loader2 size={14} className="animate-spin text-[#fa7150]" />
            ) : hotels.length === 0 ? (
              <span className="text-xs text-amber-600 font-bold">Chưa có cơ sở nào</span>
            ) : (
              <select
                value={selectedHotelId ?? ''}
                onChange={e => setSelectedHotelId(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-[#303330] focus:outline-none cursor-pointer hover:text-[#fa7150] transition-colors"
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ── Main two-column layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Conversation list ─────────────────────────────────────── */}
        <div className="w-80 border-r border-[#e5d8d0] flex flex-col bg-white shrink-0">

          {/* Header */}
          <div className="px-5 py-4 border-b border-[#e5d8d0] shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-[#303330] text-base flex items-center gap-2">
                <MessageCircle size={17} className="text-[#a43e24]" />
                Tin nhắn
                {totalUnread > 0 && (
                  <span className="bg-[#a43e24] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1">
                {status === 'connected' ? (
                  <Wifi size={11} className="text-emerald-500" />
                ) : status === 'connecting' ? (
                  <Loader2 size={11} className="text-amber-500 animate-spin" />
                ) : (
                  <WifiOff size={11} className="text-rose-400" />
                )}
                <span className={`text-[9px] font-bold ${
                  status === 'connected' ? 'text-emerald-600'
                  : status === 'connecting' ? 'text-amber-600'
                  : 'text-rose-500'
                }`}>
                  {status === 'connected' ? 'Online' : status === 'connecting' ? 'Đang kết nối' : 'Mất kết nối'}
                </span>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={22} className="animate-spin text-[#a43e24]" />
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <MessageCircle size={30} className="text-[#e5d8d0] mx-auto mb-2" />
                <p className="text-xs text-rose-500 font-bold leading-relaxed">{error}</p>
              </div>
            ) : isPartner && hotels.length === 0 ? (
              <div className="p-6 text-center">
                <Building size={30} className="text-[#e5d8d0] mx-auto mb-2" />
                <p className="text-xs font-bold text-amber-600">Chưa có cơ sở nào</p>
                <p className="text-[10px] text-[#8a7e75] mt-1">Tạo khách sạn để nhận tin nhắn từ chủ nuôi</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle size={30} className="text-[#e5d8d0] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#8a7e75]">Chưa có hội thoại nào</p>
                <p className="text-[10px] text-[#8a7e75] mt-1">Chủ nuôi sẽ nhắn tin khi có booking</p>
              </div>
            ) : (
              conversations.map(conv => {
                const active = selectedId === conv.id
                const hasUnread = (conv.unreadCount ?? 0) > 0
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left px-4 py-3.5 border-b border-[#e5d8d0] flex gap-3 items-start transition-colors ${
                      active ? 'bg-[#feeadb]' : 'hover:bg-[#faf9f6]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#a43e24]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={15} className="text-[#a43e24]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs truncate ${hasUnread ? 'font-black text-[#303330]' : 'font-bold text-[#5a5550]'}`}>
                          Booking #{conv.bookingId.substring(0, 8).toUpperCase()}
                        </span>
                        {hasUnread && (
                          <span className="bg-[#a43e24] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ml-1">
                            {(conv.unreadCount ?? 0) > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate ${hasUnread ? 'font-semibold text-[#303330]' : 'text-[#8a7e75]'}`}>
                        {conv.lastMessageContent ?? 'Chưa có tin nhắn'}
                      </p>
                      {conv.lastMessageAt && (
                        <p className="text-[9px] text-[#8a7e75]/70 mt-0.5">
                          {formatTime(conv.lastMessageAt)}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat area ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedId && selectedConv ? (
            <>
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-[#e5d8d0] bg-white flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#a43e24]/10 flex items-center justify-center shrink-0">
                  <User size={14} className="text-[#a43e24]" />
                </div>
                <div>
                  <p className="font-black text-sm text-[#303330]">
                    Booking #{selectedConv.bookingId.substring(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-[#8a7e75]">Chủ nuôi</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#faf9f6]">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin text-[#a43e24]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={30} className="text-[#e5d8d0] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#8a7e75]">Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const mine = msg.senderRole === 'STAFF'
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                          <span className={`text-[9px] font-black uppercase tracking-wide ${mine ? 'text-[#a43e24]' : 'text-[#44683b]'}`}>
                            {mine ? 'Bạn' : 'Chủ nuôi'}
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
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-3 border-t border-[#e5d8d0] flex gap-2 items-end bg-white shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={status === 'connected' ? 'Nhắn tin cho chủ nuôi...' : 'Đang kết nối lại...'}
                  rows={1}
                  disabled={status !== 'connected'}
                  className="flex-1 resize-none border border-[#e5d8d0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#a43e24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ maxHeight: '80px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || status !== 'connected'}
                  className="p-2.5 rounded-xl text-white flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ backgroundColor: '#a43e24' }}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#faf9f6]">
              <div className="text-center">
                <MessageCircle size={48} className="text-[#e5d8d0] mx-auto mb-4" />
                <p className="font-black text-[#303330] text-lg">Chọn hội thoại</p>
                <p className="text-xs text-[#8a7e75] mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin với chủ nuôi
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
