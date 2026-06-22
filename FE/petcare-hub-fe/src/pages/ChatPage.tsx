import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, PawPrint } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Header } from '@/components/Header'

interface Message {
  role: 'user' | 'model'
  content: string
}

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Xin chào! Tôi là trợ lý tư vấn của PetCare Hub 🐾\nBạn muốn gửi bé cưng loại nào? Chó hay mèo? Dự kiến mấy đêm? Tôi sẽ gợi ý phòng + ước tính giá cho bạn!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      setMessages([...next, { role: 'model', content: res.data.reply }])
    } catch {
      setMessages([...next, {
        role: 'model',
        content: 'Xin lỗi, có lỗi kết nối. Bạn thử lại sau nhé! 🐾'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 flex flex-col">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-[#feeadb] rounded-full flex items-center justify-center mx-auto mb-3">
            <PawPrint size={28} className="text-[#a43e24]" />
          </div>
          <h1 className="text-2xl font-black text-[#303330]">Tư vấn chọn phòng</h1>
          <p className="text-xs text-[#8a7e75] mt-1">Trợ lý AI giúp bạn chọn phòng & ước tính giá — không tự đặt phòng</p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 bg-white rounded-3xl border border-[#e1e3df] shadow-sm p-4 flex flex-col gap-3 overflow-y-auto min-h-[400px] max-h-[520px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'model' ? 'bg-[#feeadb] text-[#a43e24]' : 'bg-[#d0fac0] text-[#44683b]'
              }`}>
                {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-[#a43e24] text-white rounded-tr-sm'
                  : 'bg-[#f4f4f0] text-[#303330] rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#feeadb] text-[#a43e24] flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-[#f4f4f0] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#a43e24]" />
                <span className="text-xs text-[#8a7e75]">Đang tư vấn...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-4 flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập câu hỏi... (Enter để gửi)"
            rows={2}
            className="flex-1 border border-[#e1e3df] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24] resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-12 h-12 self-end rounded-full bg-[#a43e24] text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="text-center text-[10px] text-[#8a7e75] mt-3">
          Giá hiển thị là ước tính. Giá chính thức xác nhận khi đặt phòng.
        </p>
      </main>
    </div>
  )
}
