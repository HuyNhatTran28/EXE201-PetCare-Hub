import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageCircle, Loader2, Wifi, WifiOff,
  Search, X, Trash2, MoreHorizontal, Mail, Bell, Phone, Video, Ban, User
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'
import { useAuthStore } from '@/store/authStore'
import { useHotelStore } from '@/store/hotelStore'

interface ConversationItem {
  id: string
  bookingId: string
  petOwnerId: string
  hotelId: string
  lastMessageAt: string | null
  lastMessageContent: string | null
  unreadCount: number
}

const sortByRecent = (list: ConversationItem[]): ConversationItem[] =>
  [...list].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return tb - ta
  })

const relTime = (iso: string | null): string => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'Vừa xong'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`
  return `${Math.floor(diff / 86400000)} ngày`
}

const AVATAR_COLORS = [
  'bg-[#fa7150]', 'bg-[#a43e24]', 'bg-emerald-500',
  'bg-sky-500', 'bg-violet-500', 'bg-amber-500',
]

interface MessengerPanelProps {
  onClose: () => void
}

export const MessengerPanel = ({ onClose }: MessengerPanelProps) => {
  const { user } = useAuthStore()
  const isPartner = user?.role === 'PARTNER'
  const isStaff = user?.role === 'STAFF'

  // Hotel selection and chat windows driven by hotelStore
  const { selectedHotelId, openChatWindow } = useHotelStore()

  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [conversations, setConversations]     = useState<ConversationItem[]>([])
  const [convSearch, setConvSearch]           = useState('')
  const [convFilter, setConvFilter]           = useState<'all' | 'unread'>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingConvId, setDeletingConvId]   = useState<string | null>(null)
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null)

  const { status, connect, subscribe, disconnect } = useChatSocket()

  // ── Load conversation list (re-fetches when hotel changes via store) ──────
  useEffect(() => {
    if (isPartner && !selectedHotelId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const params = isPartner && selectedHotelId ? { hotelId: selectedHotelId } : undefined
    const url = (isPartner || isStaff) ? '/api/conversations/hotel' : '/api/conversations/me'
    axiosInstance
      .get<{ data: ConversationItem[] }>(url, { params })
      .then(res => setConversations(sortByRecent(res.data.data ?? [])))
      .catch(err => setError(err.response?.data?.message ?? 'Không thể tải hội thoại.'))
      .finally(() => setLoading(false))
  }, [isPartner, isStaff, selectedHotelId])

  // ── STOMP connect / disconnect ────────────────────────────────────────────
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // ── Incoming message handler ───────────────────────────────────────────────
  const handleIncoming = useCallback((convId: string, msg: MessageResponse) => {
    setConversations(prev =>
      sortByRecent(
        prev.map(c =>
          c.id === convId
            ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1, lastMessageContent: msg.content, lastMessageAt: msg.sentAt }
            : c
        )
      )
    )
    if (msg.senderId !== user?.id) {
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: { 
          title: user?.role === 'OWNER' ? 'Tin nhắn mới từ Cửa hàng' : 'Tin nhắn mới từ Chủ nuôi', 
          message: msg.content, 
          type: 'message', 
          bookingId: convId 
        }
      }))
    }
  }, [user])

  // ── Subscribe to all conversations ────────────────────────────────────────
  const convIdsKey = conversations.map(c => c.id).join(',')
  useEffect(() => {
    if (status !== 'connected' || !convIdsKey) return
    const ids = convIdsKey.split(',').filter(Boolean)
    const unsubs = ids.map(id => subscribe(id, msg => handleIncoming(id, msg)))
    return () => unsubs.forEach(fn => fn())
  }, [status, convIdsKey, subscribe, handleIncoming])

  // ── Delete conversation ───────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingConvId) return
    try {
      await axiosInstance.delete(`/api/conversations/${deletingConvId}`)
      setConversations(prev => prev.filter(c => c.id !== deletingConvId))
    } catch { alert('Không thể xóa hội thoại.') }
    finally { setShowDeleteConfirm(false); setDeletingConvId(null) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalUnread   = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0)
  const filteredConvs = conversations.filter(c => {
    const q = convSearch.toLowerCase()
    const matchSearch = q === '' || c.bookingId.toLowerCase().includes(q)
    const matchFilter = convFilter === 'all' || (c.unreadCount ?? 0) > 0
    return matchSearch && matchFilter
  })

  return (
    <>
      {/* Backdrop for closing */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel — fixed to viewport top-right */}
      <div
        className="fixed right-4 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[#e5d8d0] bg-white animate-in fade-in slide-in-from-top-2 duration-150"
        style={{
          top: '60px',
          width: '360px',
          height: '520px',
          maxHeight: 'calc(100vh - 72px)',
          boxShadow: '0 20px 60px -10px rgba(48,51,48,0.18), 0 10px 20px -5px rgba(0,0,0,0.06)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── TOP: Conversation list ────────────────────────────── */}
        <div className="shrink-0 flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-[#303330] text-lg">Đoạn chat</h2>
              <div className="flex items-center gap-2">
                {/* Status pill */}
                {status === 'connected' ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <Wifi size={8} /> Online
                  </span>
                ) : status === 'connecting' ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <Loader2 size={8} className="animate-spin" /> Đang kết nối
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    <WifiOff size={8} /> Mất kết nối
                  </span>
                )}
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#8a7e75] transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
              <input
                type="text"
                placeholder="Tìm kiếm trên Messenger"
                value={convSearch}
                onChange={e => setConvSearch(e.target.value)}
                className="w-full bg-[#f0f2f5] rounded-full py-1.5 pl-8 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#fa7150]/20 focus:bg-white transition-all placeholder:text-[#8a7e75]"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {(['all', 'unread'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setConvFilter(f)}
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                    convFilter === f
                      ? 'bg-[#fa7150]/10 text-[#a43e24]'
                      : 'bg-[#f0f2f5] text-[#5a5550] hover:bg-[#e5d8d0]'
                  }`}
                >
                  {f === 'all' ? 'Tất cả' : `Chưa đọc${totalUnread > 0 ? ` (${totalUnread})` : ''}`}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-grow overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 size={20} className="animate-spin text-[#fa7150]" />
              </div>
            ) : error ? (
              <p className="text-xs text-rose-500 font-bold text-center p-4">{error}</p>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle size={28} className="text-[#e5d8d0] mx-auto mb-2" />
                <p className="text-xs font-black text-[#8a7e75]">
                  {convSearch ? 'Không tìm thấy kết quả' : convFilter === 'unread' ? 'Không có tin chưa đọc' : 'Chưa có hội thoại nào'}
                </p>
                <p className="text-[10px] text-[#8a7e75]/70 mt-1">
                  {convSearch ? 'Thử từ khóa khác' : 'Chủ nuôi sẽ nhắn tin khi có booking'}
                </p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const colorIdx  = conv.bookingId.charCodeAt(0) % AVATAR_COLORS.length
                const initials  = conv.bookingId.substring(0, 2).toUpperCase()
                const rt        = relTime(conv.lastMessageAt)
                const hasUnread = (conv.unreadCount ?? 0) > 0

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      openChatWindow(conv.id, conv.bookingId)
                      onClose()
                    }}
                    className="w-full text-left px-3 py-2.5 flex gap-3 items-center transition-colors group hover:bg-[#f0f2f5]"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-xs text-white relative ${AVATAR_COLORS[colorIdx]}`}>
                      {initials}
                      {hasUnread && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#a43e24] rounded-full border-2 border-white" />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs truncate ${hasUnread ? 'font-black text-[#050505]' : 'font-semibold text-[#303330]'}`}>
                          Booking #{conv.bookingId.substring(0, 8).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 relative">
                          {rt && <span className={`text-[9px] ${hasUnread ? 'text-[#a43e24] font-bold' : 'text-[#8a7e75]'}`}>{rt}</span>}
                          
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setActiveMenuConvId(activeMenuConvId === conv.id ? null : conv.id)
                            }}
                            className={`p-1 rounded-full hover:bg-[#e4e6eb] text-[#5a5550] transition-all cursor-pointer ${
                              activeMenuConvId === conv.id ? 'opacity-100 bg-[#e4e6eb]' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <MoreHorizontal size={13} />
                          </button>

                          {/* Dropdown Options Menu */}
                          {activeMenuConvId === conv.id && (
                            <>
                              {/* Overlay screen to dismiss */}
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={e => {
                                  e.stopPropagation()
                                  setActiveMenuConvId(null)
                                }}
                              />
                              <div
                                className="absolute right-0 mt-6 w-52 bg-white rounded-xl shadow-2xl border border-[#e5d8d0] p-1 z-50 text-left text-xs font-semibold text-[#050505] flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100"
                                onClick={e => e.stopPropagation()}
                              >
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <Mail size={13} className="text-[#5a5550]" />
                                  Đánh dấu là chưa đọc
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <MessageCircle size={13} className="text-[#5a5550]" />
                                  Mở phần nhắn tin
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <Bell size={13} className="text-[#5a5550]" />
                                  Tắt thông báo
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <User size={13} className="text-[#5a5550]" />
                                  Xem trang cá nhân
                                </button>
                                
                                <div className="border-t border-[#e5d8d0]/60 my-0.5" />
                                
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <Phone size={13} className="text-[#5a5550]" />
                                  Gọi thoại
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <Video size={13} className="text-[#5a5550]" />
                                  Chat video
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuConvId(null) }} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#f0f2f5] flex items-center gap-2 transition-colors cursor-pointer font-medium">
                                  <Ban size={13} className="text-[#5a5550]" />
                                  Chặn
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingConvId(conv.id)
                                    setShowDeleteConfirm(true)
                                    setActiveMenuConvId(null)
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors cursor-pointer font-bold"
                                >
                                  <Trash2 size={13} className="text-rose-500" />
                                  Xóa đoạn chat
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-[10px] truncate flex-1 ${hasUnread ? 'font-extrabold text-[#050505]' : 'text-[#8a7e75]'}`}>
                          {conv.lastMessageContent ?? 'Bắt đầu cuộc trò chuyện...'}
                        </p>
                        {hasUnread && <span className="w-2 h-2 rounded-full bg-[#a43e24] shrink-0" />}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation — Facebook Messenger Style */}
      {showDeleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45"
          onClick={() => { setShowDeleteConfirm(false); setDeletingConvId(null) }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-[#e5d8d0]/60 relative justify-center">
              <h3 className="font-extrabold text-[#050505] text-base text-center">Xóa đoạn chat</h3>
              <button 
                onClick={() => { setShowDeleteConfirm(false); setDeletingConvId(null) }}
                className="absolute right-4 w-8 h-8 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#5a5550] hover:bg-[#e4e6eb] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="px-4 py-5 text-[14px] text-[#050505] font-normal leading-relaxed text-left">
              Bạn không thể hoàn tác sau khi xóa bản sao của cuộc trò chuyện này.
            </div>

            {/* Actions (Right-aligned) */}
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletingConvId(null) }}
                className="px-4 py-2 rounded-lg text-[#5a5550] hover:bg-[#f0f2f5] text-[14px] font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Xóa đoạn chat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
