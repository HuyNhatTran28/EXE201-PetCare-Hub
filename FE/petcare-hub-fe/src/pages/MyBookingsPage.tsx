import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PawPrint,
  Heart,
  Calendar,
  Camera,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2,
  Smile,
  Activity,
  Utensils,
  Video,
  Phone,
  Send,
  PlusCircle,
  FileImage,
  ArrowLeft
} from 'lucide-react'

// Mock Chat history
const INITIAL_CHAT = [
  { id: '1', sender: 'STAFF', text: 'Chào bạn! Bé LuLu vừa ngủ trưa dậy xong. Bé cực kỳ tràn đầy năng lượng ngày hôm nay!', time: '13:45', image: null },
  { id: '2', sender: 'STAFF', text: 'Nhìn cái vươn vai sảng khoái của bé kìa! 😍', time: '13:47', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300' },
  { id: '3', sender: 'USER', text: 'Ôi trông bé hạnh phúc quá! Cảm ơn bảo mẫu nhiều nha. Trưa nay bé có kén ăn hạt nữa không?', time: '14:10', image: null },
]

export const MyBookingsPage = () => {
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT)
  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const newMsg = {
      id: String(chatMessages.length + 1),
      sender: 'USER',
      text: inputVal,
      time: '14:12',
      image: null
    }

    setChatMessages([...chatMessages, newMsg])
    setInputVal('')

    // Kích hoạt giả lập phản hồi của nhân viên sau 1.5 giây
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const staffReply = {
        id: String(chatMessages.length + 2),
        sender: 'STAFF',
        text: 'Bé đã ăn hết sạch phần pate cá hồi tươi trộn rau củ ạ. Ăn cực kì ngon lành luôn nha bạn!',
        time: '14:13',
        image: null
      }
      setChatMessages(prev => [...prev, staffReply])
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#fa7150] selection:text-white pb-24">
      
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2">
          <PawPrint size={28} className="text-[#fa7150]" />
          <span className="text-xl font-bold tracking-tight">Pet Sanctuary</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Trang chủ</Link>
          <Link to="/hotels" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Khách sạn</Link>
          <Link to="/my-bookings" className="text-sm font-bold text-[#fa7150] border-b-2 border-[#fa7150] pb-1">Nhật ký</Link>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Banner tiêu đề trạng thái lưu trú */}
        <section className="mb-12 text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block bg-[#d0fac0] text-[#2c4e24] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3">
                Đang lưu trú
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#303330] leading-tight">
                Kỳ nghỉ của LuLu
              </h1>
              <p className="text-[#8a7e75] text-xs sm:text-sm mt-2">
                Ngày 3 của 7 • <strong>Phòng Suite Sân Vườn</strong> • Được chăm sóc trực tiếp bởi bảo mẫu <strong className="text-[#fa7150]">Sarah Jenkins</strong>
              </p>
            </div>
            
            {/* Avatar bé cưng */}
            <div className="flex -space-x-4">
              <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-md">
                <img 
                  src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=150" 
                  alt="LuLu"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-[#fff0e6] flex items-center justify-center shadow-md">
                <Heart size={20} className="text-[#fa7150]" fill="currentColor" />
              </div>
            </div>
          </div>
        </section>

        {/* Nội dung chia cột bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* CỘT TRÁI: NHẬT KÝ timeline & HÌNH ẢNH (8 cột) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Grid 3 chỉ số trong ngày */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Thức ăn */}
              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] text-[#fa7150] flex items-center justify-center mb-3">
                  <Utensils size={20} />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase text-[#8a7e75]">Dinh dưỡng</span>
                <p className="font-black text-base text-[#44683b] mt-1">Ngon miệng tốt</p>
              </div>

              {/* Tâm trạng */}
              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] text-[#fa7150] flex items-center justify-center mb-3">
                  <Smile size={20} />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase text-[#8a7e75]">Tâm trạng</span>
                <p className="font-black text-base text-[#fa7150] mt-1">Vô cùng vui vẻ</p>
              </div>

              {/* Hoạt động */}
              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] text-[#fa7150] flex items-center justify-center mb-3">
                  <Activity size={20} />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase text-[#8a7e75]">Vận động</span>
                <p className="font-black text-base text-[#a43e24] mt-1">Siêu năng động</p>
              </div>

            </div>

            {/* Khoảnh khắc hình ảnh trong ngày */}
            <div className="bg-[#fdfaf8] p-8 rounded-3xl border border-[#e5d8d0]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-[#303330]">Khoảnh khắc trong ngày của bé</h2>
                <button className="text-xs font-bold text-[#fa7150] hover:underline">Tải về tất cả ảnh</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Ảnh to chính */}
                <div className="sm:col-span-2 sm:row-span-2 relative overflow-hidden rounded-2xl border border-[#e5d8d0]">
                  <img 
                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=500" 
                    alt="Bé chạy ngoài sân" 
                    className="w-full h-full object-cover aspect-[4/3] sm:aspect-auto"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#e5d8d0]">
                    <p className="text-[10px] font-bold text-[#303330]">Vui đùa ngoài sân • 9:15 AM</p>
                  </div>
                </div>

                {/* Ảnh nhỏ 1 */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e5d8d0] aspect-[4/3] sm:aspect-square">
                  <img 
                    src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=300" 
                    alt="Giờ ăn"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#303330]/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Video size={32} className="text-white" />
                  </div>
                </div>

                {/* Ảnh nhỏ 2 */}
                <div className="relative overflow-hidden rounded-2xl border border-[#e5d8d0] aspect-[4/3] sm:aspect-square">
                  <img 
                    src="https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&q=80&w=300" 
                    alt="Giờ ngủ trưa"
                    className="w-full h-full object-cover"
                  />
                </div>

              </div>
            </div>

            {/* Dòng thời gian cập nhật */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-[#303330] px-2">Nhật ký chi tiết từ Bảo Mẫu</h3>
              <div className="relative pl-8 border-l-2 border-[#fa7150]/20 space-y-10 ml-4">
                
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[2.35rem] top-0 w-5 h-5 rounded-full bg-[#fa7150] border-4 border-[#faf9f6] shadow-sm" />
                  <p className="text-[10px] font-black text-[#8a7e75] mb-2 uppercase tracking-wider">12:30 PM • Cập nhật Trưa</p>
                  <div className="bg-white p-6 rounded-2xl border border-[#e5d8d0] shadow-sm">
                    <h4 className="font-bold text-base text-[#303330]">"Bữa Trưa Hảo Hạng Cá Hồi"</h4>
                    <p className="text-xs text-[#5a5550] leading-relaxed mt-2">
                      LuLu đã ăn hết sạch khẩu phần dinh dưỡng. Bé dạo chơi 10 phút ngoài thảm cỏ rồi ngủ trưa cực ngon lành. Sức khỏe và nhịp tim ổn định hoàn toàn.
                    </p>
                    <span className="inline-block mt-3 bg-[#d0fac0] text-[#2c4e24] px-3 py-1 rounded-full text-[9px] font-black uppercase">Đã hoàn thành</span>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[2.35rem] top-0 w-5 h-5 rounded-full bg-[#44683b] border-4 border-[#faf9f6] shadow-sm" />
                  <p className="text-[10px] font-black text-[#8a7e75] mb-2 uppercase tracking-wider">08:15 AM • Kiểm tra Sáng</p>
                  <div className="bg-white p-6 rounded-2xl border border-[#e5d8d0] shadow-sm">
                    <h4 className="font-bold text-base text-[#303330]">Vệ sinh cá nhân & Chải lông</h4>
                    <p className="text-xs text-[#5a5550] leading-relaxed mt-2">
                      Kiểm tra cân nặng sáng đạt 12.5kg. Bé được chải mượt lông, cắt tỉa khóe móng chân và cực kỳ thân thiện hợp tác.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* CỘT PHẢI: TRUNG TÂM CHAT VỚI BẢO MẪU (4 cột) */}
          <div className="lg:col-span-4 flex flex-col h-[650px] sticky top-24">
            <div className="bg-white rounded-3xl border border-[#e5d8d0] shadow-xl flex flex-col h-full overflow-hidden">
              
              {/* Header của Chat */}
              <div className="p-4 bg-[#fdfaf8] border-b border-[#e5d8d0] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100" 
                      alt="Sarah Jenkins"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#44683b] rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#303330]">Sarah Jenkins</h4>
                    <p className="text-[9px] text-[#44683b] font-black uppercase tracking-wider">Đang trực bảo mẫu</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded-full hover:bg-[#f5ede8] flex items-center justify-center text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer">
                    <Video size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-full hover:bg-[#f5ede8] flex items-center justify-center text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer">
                    <Phone size={16} />
                  </button>
                </div>
              </div>

              {/* Lịch sử Tin nhắn chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdfaf8]/40">
                <div className="flex justify-center">
                  <span className="text-[9px] font-black text-[#8a7e75] bg-[#f5ede8] px-3 py-1 rounded-full uppercase">Hôm nay</span>
                </div>

                {chatMessages.map((msg) => {
                  const isStaff = msg.sender === 'STAFF'
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${isStaff ? '' : 'ml-auto justify-end'}`}
                    >
                      <div className="flex-1 text-left">
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isStaff 
                            ? 'bg-[#f5ede8] text-[#303330] rounded-tl-none' 
                            : 'bg-[#fa7150] text-white rounded-tr-none font-semibold'
                        }`}>
                          {msg.text}
                          {msg.image && (
                            <div className="mt-3 rounded-xl overflow-hidden max-h-36 shadow-sm border border-[#e5d8d0]">
                              <img 
                                src={msg.image} 
                                alt="Oliver gửi hình"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                        <span className={`text-[9px] text-[#8a7e75] mt-1 block ${isStaff ? 'ml-1' : 'mr-1 text-right'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Giả lập Sarah đang gõ chữ */}
                {isTyping && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <div className="w-1.5 h-1.5 bg-[#fa7150] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#fa7150] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-[#fa7150] rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[9px] text-[#8a7e75] ml-2">Sarah đang soạn tin...</span>
                  </div>
                )}
              </div>

              {/* Ô Nhập tin nhắn & Trả lời nhanh */}
              <div className="p-4 bg-white border-t border-[#e5d8d0]">
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-none">
                  <button 
                    onClick={() => setInputVal('Cảm ơn bạn nhiều nha! ❤️')}
                    className="whitespace-nowrap bg-[#fdfaf8] border border-[#e5d8d0] hover:border-[#fa7150] px-3.5 py-1.5 rounded-full text-[10px] font-bold text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer"
                  >
                    Cảm ơn bạn! ❤️
                  </button>
                  <button 
                    onClick={() => setInputVal('Bé đã đi vệ sinh chưa bạn?')}
                    className="whitespace-nowrap bg-[#fdfaf8] border border-[#e5d8d0] hover:border-[#fa7150] px-3.5 py-1.5 rounded-full text-[10px] font-bold text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer"
                  >
                    Bé đã đi vệ sinh chưa?
                  </button>
                </div>
                
                <form onSubmit={handleSendChat} className="flex items-center gap-2 bg-[#f5ede8] rounded-full px-4 py-2">
                  <button type="button" className="text-[#8a7e75] hover:text-[#fa7150] cursor-pointer">
                    <PlusCircle size={18} />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Gửi lời nhắn cho Bảo mẫu..." 
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="flex-grow bg-transparent border-none outline-none focus:ring-0 text-xs py-1 placeholder-[#8a7e75]"
                  />
                  <button 
                    type="submit"
                    className="w-8 h-8 bg-[#fa7150] rounded-full flex items-center justify-center text-white shadow-sm hover:scale-105 transition-all cursor-pointer"
                  >
                    <Send size={14} fill="currentColor" />
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
