import { Link } from 'react-router-dom'
import { PawPrint, ArrowLeft, Home } from 'lucide-react'

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col items-center justify-center p-6 selection:bg-[#fa7150] selection:text-white">
      
      {/* Container chính */}
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Logo */}
        <div className="flex justify-center items-center gap-2">
          <PawPrint size={32} className="text-[#fa7150] animate-bounce" />
          <span className="text-2xl font-black tracking-tight">PetCare Hub</span>
        </div>

        {/* Cảnh báo 404 hình ảnh dễ thương */}
        <div className="relative">
          <img 
            src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=500" 
            alt="Chú chó bị lạc" 
            className="w-full h-64 object-cover rounded-3xl border border-[#e5d8d0] shadow-xl"
          />
          <div className="absolute top-4 left-4 bg-[#a43e24] text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
            Lỗi 404
          </div>
        </div>

        {/* Tiêu đề lỗi */}
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-[#303330]">
            Trang này bị lạc mất rồi!
          </h2>
          <p className="text-xs sm:text-sm text-[#5a5550] leading-relaxed px-4">
            Đường link bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang vị trí khác. Hãy để chú chó dẫn đường cho bạn quay trở lại nhà an toàn nhé!
          </p>
        </div>

        {/* Nút hành động */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link 
            to="/" 
            className="w-full sm:w-auto bg-[#fa7150] text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150]/90 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#fa7150]/20"
          >
            <Home size={14} /> Quay về Trang chủ
          </Link>
          
          <Link 
            to="/hotels" 
            className="w-full sm:w-auto bg-[#fbf7f4] text-[#303330] border border-[#e5d8d0] px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} /> Đi xem Khách sạn
          </Link>
        </div>

      </div>

    </div>
  )
}
