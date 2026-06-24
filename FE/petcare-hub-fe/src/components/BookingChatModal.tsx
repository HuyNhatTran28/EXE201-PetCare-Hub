import { useEffect, useRef, useState } from 'react'
import { X, Send, Loader2, MessageCircle, Wifi, WifiOff } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'

interface Props {
  conversationId: string
  hotelName: string
  onClose: () => void
}

export const BookingChatModal = ({ conversationId, hotelName, onClose }: Props) => {
  const currentUserId = useAuthStore(s => s.user?.id)
  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { status, connect, subscribe, sendMessage, disconnect } = useChatSocket()

  useEffect(() => {
    axiosInstance
      .get<{ data: MessageResponse[] }>(`/api/conversations/${conversationId}/messages`)
      .then(res => setMessages(res.data.data ?? []))
      .catch(err => console.error('Failed to load chat history:', err))
      .finally(() => setLoading(false))
  }, [conversationId])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  useEffect(() => {
    if (status !== 'connected') return
    return subscribe(conversationId, msg => {
      setMessages(prev => [...prev, msg])
    })
  }, [status, conversationId, subscribe])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const content = input.trim()
    if (!content) return
    if (sendMessage(conversationId, content)) {
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

  const isMine = (msg: MessageResponse) =>
    msg.senderRole === 'OWNER' || msg.senderId === currentUserId

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg flex flex-col border border-[#e5d8d0] shadow-2xl"
        style={{ height: '580px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 rounded-t-3xl"
          style={{ backgroundColor: '#a43e24' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageCircle size={18} className="text-white flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-black text-sm truncate">{hotelName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {status === 'connected' ? (
                  <>
                    <Wifi size={10} className="text-white/80" />
                    <span className="text-[10px] text-white/80 font-bold">Đã kết nối</span>
                  </>
                ) : status === 'connecting' ? (
                  <>
                    <Loader2 size={10} className="text-white/80 animate-spin" />
                    <span className="text-[10px] text-white/80 font-bold">Đang kết nối...</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={10} className="text-white/60" />
                    <span className="text-[10px] text-white/60 font-bold">Mất kết nối, đang thử lại</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#faf9f6]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-[#a43e24]" size={24} />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={32} className="text-[#e5d8d0] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#8a7e75]">Chưa có tin nhắn nào</p>
              <p className="text-[10px] text-[#8a7e75] mt-1">Bắt đầu cuộc trò chuyện với khách sạn!</p>
            </div>
          ) : (
            messages.map(msg => {
              const mine = isMine(msg)
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
                      {new Date(msg.sentAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#e5d8d0] flex gap-2 items-end bg-white rounded-b-3xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'connected' ? 'Nhắn tin...' : 'Đang kết nối...'}
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
      </div>
    </div>
  )
}
