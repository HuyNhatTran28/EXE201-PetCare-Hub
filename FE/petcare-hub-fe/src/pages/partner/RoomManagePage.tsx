import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  PawPrint,
  ArrowLeft,
  PlusCircle,
  Video,
  DollarSign,
  Maximize2,
  Trash2,
  Edit3
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface RoomType {
  id: string
  name: string
  pricePerNight: number
  maxPets: number
  totalRooms: number
  allowedPetTypes: string[]
  hasWebcam: boolean
  description: string
}

export const RoomManagePage = () => {
  const { hotelId } = useParams<{ hotelId: string }>()
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axiosInstance.get(`/api/room-types/hotel/${hotelId}`)
        setRooms(response.data)
      } catch (error) {
        console.error('Failed to load room types', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [hotelId])

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans text-left">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="text-[#8a7e75] hover:text-[#fa7150] transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <span className="text-xl font-bold tracking-tight">Cấu hình Loại Phòng</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black text-[#303330]">Danh Sách Loại Phòng</h1>
            <p className="text-[#5a5550] text-sm mt-1">Cấu hình giá tiền, số lượng phòng và kiểm soát camera giám sát webcam cho khách hàng.</p>
          </div>
          <button className="bg-[#fa7150] text-white px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer">
            <PlusCircle size={16} /> Thêm loại phòng mới
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#8a7e75] font-bold text-sm">Đang tải danh sách phòng...</div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-white">
            <p className="text-[#8a7e75] font-bold text-sm">Khách sạn chưa có loại phòng nào. Hãy thêm phòng mới để bắt đầu nhận booking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-[#e5d8d0] rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-black text-[#303330]">{room.name}</h3>
                  <div className="flex gap-2">
                    <button className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[#8a7e75] hover:text-[#fa7150] transition-colors"><Edit3 size={16} /></button>
                    <button className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>

                <p className="text-xs text-[#5a5550] leading-relaxed mb-6">{room.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#fdfaf8] p-4 rounded-2xl border border-[#e5d8d0]/60">
                    <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1 flex items-center gap-1"><DollarSign size={12} /> Giá / Đêm</span>
                    <span className="text-lg font-black text-[#303330]">{room.pricePerNight.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="bg-[#fdfaf8] p-4 rounded-2xl border border-[#e5d8d0]/60">
                    <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1 flex items-center gap-1"><Maximize2 size={12} /> Sức chứa</span>
                    <span className="text-lg font-black text-[#303330]">{room.maxPets} thú cưng</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e5d8d0]/60 pt-4 text-xs font-bold">
                  <div className="flex gap-1.5">
                    {room.allowedPetTypes.map((type, idx) => (
                      <span key={idx} className="bg-[#f5ede8] px-2.5 py-1 rounded-lg text-[#8a7e75] text-[10px] uppercase">
                        {type === 'Dog' ? '🐶 Chó' : '🐱 Mèo'}
                      </span>
                    ))}
                  </div>

                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                    room.hasWebcam ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Video size={12} /> {room.hasWebcam ? 'Có Webcam 24/7' : 'Không có camera'}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  )
}
