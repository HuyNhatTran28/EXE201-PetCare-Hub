import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PawPrint,
  Heart,
  PlusCircle,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  FileText,
  User,
  LogOut,
  Clock,
  ArrowRight,
  UtensilsCrossed,
  Activity,
  Smile,
  CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'

interface PetType {
  id: string
  name: string
  breed: string
  ageYears: number
  weightKg: number
  microchipId: string | null
  avatarUrl: string | null
  status?: string
  personalityTags?: string[]
  specialNotes?: string | null
  feedingSchedule?: string | null
  foodType?: string | null
  vaccines?: Array<{
    name: string
    doctor: string
    status: string
    date: string
    nextDate: string
  }>
}

export const PetProfilePage = () => {
  const { user } = useAuthStore()
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await axiosInstance.get('/api/pets/my')
        const fetchedPets = response.data.map((p: any) => ({
          ...p,
          status: p.status || 'Tại nhà',
          personalityTags: p.personalityTags || ['Đã tiêm chủng', 'Khỏe mạnh'],
          specialNotes: p.specialNotes || 'Chưa có ghi chú chăm sóc đặc biệt.',
          feedingSchedule: p.feedingSchedule || 'Chạy bộ nhặt bóng ngoài trời 30 phút hằng ngày.',
          foodType: p.foodType || 'Hạt dinh dưỡng cao cấp trộn thịt bò xay nhuyễn.',
          vaccines: p.vaccines || [
            { name: 'Mũi nhắc lại Dại', doctor: 'BS. Nguyễn Minh', status: 'COMPLETED', date: '14/08/2025', nextDate: '14/08/2026' }
          ]
        }))
        setPets(fetchedPets)
        if (fetchedPets.length > 0) {
          setSelectedPetId(fetchedPets[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch pets', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPets()
  }, [])

  // Lấy bé đang được chọn
  const activePet = pets.find(p => p.id === selectedPetId)

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
          <Link to="/pets" className="text-sm font-bold text-[#fa7150] border-b-2 border-[#fa7150] pb-1">Thú cưng</Link>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-6 pt-12">
        
        {/* Banner tiêu đề */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 text-left">
          <div className="space-y-2">
            <span className="text-[#fa7150] text-xs font-black tracking-wider uppercase">Bảng điều khiển thành viên</span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#303330]">
              Gia Đình Thú Cưng
            </h1>
            <p className="text-[#5a5550] text-sm sm:text-base max-w-xl">
              Quản lý hồ sơ, lịch trình y tế và lịch trình chăm sóc cá nhân hóa cho những người bạn nhỏ của bạn.
            </p>
          </div>
          <button className="bg-[#fa7150] text-white px-8 py-4 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer">
            <PlusCircle size={16} /> Thêm bé mới
          </button>
        </header>

        {/* Bento Grid: Danh sách Pet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {pets.map((pet) => {
            const isSelected = selectedPetId === pet.id
            const petImage = pet.avatarUrl || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400'
            return (
              <div 
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-[#fa7150] shadow-xl shadow-[#fa7150]/5 ring-4 ring-[#fa7150]/5' 
                    : 'border-[#e5d8d0] hover:shadow-lg'
                }`}
              >
                <div className="relative mb-6">
                  <div className="aspect-square rounded-2xl overflow-hidden relative">
                    <img 
                      src={petImage} 
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`absolute -bottom-3 -right-3 text-[10px] font-black px-4 py-1.5 rounded-full shadow-md text-white ${
                    pet.status === 'Đang lưu trú' ? 'bg-[#44683b]' : 'bg-[#fa7150]'
                  }`}>
                    {pet.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#303330] text-left">{pet.name}</h3>
                <p className="text-[#8a7e75] text-xs font-semibold flex items-center gap-1.5 mt-1.5 mb-4 justify-start">
                  <PawPrint size={14} className="text-[#fa7150]" /> {pet.breed} • {pet.ageYears} tuổi
                </p>
                <div className="flex gap-2.5 justify-start">
                  {(pet.personalityTags || []).map((tag, idx) => (
                    <span key={idx} className="bg-[#f5ede8] px-3 py-1 rounded-lg text-[9px] font-bold text-[#8a7e75] uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Nút thêm bé mới ảo */}
          <div className="bg-[#f5ede8]/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#e5d8d0] hover:bg-[#f5ede8] transition-colors cursor-pointer group">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
              <PlusCircle size={24} className="text-[#fa7150]" />
            </div>
            <p className="font-bold text-sm text-[#303330]">Thêm bé cưng khác</p>
            <p className="text-[10px] text-[#8a7e75] mt-1">Giảm giá 10% khi gửi 2 bé trở lên</p>
          </div>
        </div>

        {/* Thông tin Chi Tiết Bé Đang Chọn */}
        {activePet && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Sidebar Chỉ số sinh học (Trái) */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 text-left">
              <div className="bg-white p-8 rounded-3xl border border-[#e5d8d0] relative overflow-hidden shadow-xl shadow-[#a43e24]/2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d0fac0]/20 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full border-4 border-[#f5ede8] overflow-hidden mb-6 shadow-inner">
                    <img 
                      src={activePet.avatarUrl || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400'} 
                      alt={activePet.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h2 className="text-2xl font-black text-[#303330]">Chỉ số của {activePet.name}</h2>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mt-8">
                    <div className="bg-[#fdfaf8] p-4 rounded-2xl text-center border border-[#e5d8d0]/60">
                      <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1">Cân nặng</span>
                      <span className="text-lg font-black text-[#303330]">{activePet.weightKg} kg</span>
                    </div>
                    <div className="bg-[#fdfaf8] p-4 rounded-2xl text-center border border-[#e5d8d0]/60">
                      <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1">Tuổi tác</span>
                      <span className="text-lg font-black text-[#303330]">{activePet.ageYears} tuổi</span>
                    </div>
                  </div>

                  <div className="w-full mt-6 space-y-3">
                    <div className="flex justify-between items-center text-xs p-3 bg-white border-b border-[#e5d8d0]/60">
                      <span className="text-[#8a7e75] font-bold">Mã Microchip</span>
                      <span className="font-mono font-black text-[#303330]">{activePet.microchipId || '#Chưa có'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-3 bg-white border-b border-[#e5d8d0]/60">
                      <span className="text-[#8a7e75] font-bold">Giống loài</span>
                      <span className="font-black text-[#303330]">{activePet.breed}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lịch lưu trú tiếp theo */}
              <div className="bg-[#1e392a] text-white p-8 rounded-3xl shadow-xl flex flex-col gap-4 text-left">
                <h4 className="font-black text-lg">Lịch gửi phòng sắp tới</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {activePet.name} đã được lên lịch nghỉ dưỡng tại phòng <strong>Garden Suite</strong> từ ngày 12/10/2026.
                </p>
                <button className="bg-[#fa7150] text-white w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150]/90 transition-all cursor-pointer">
                  Quản lý đơn hàng
                </button>
              </div>
            </div>

            {/* Chi tiết chế độ Chăm sóc & Y tế (Phải) */}
            <div className="lg:col-span-8 space-y-12 text-left">
              
              {/* Phân hệ ghi chú chăm sóc */}
              <div className="bg-[#fdfaf8] rounded-3xl p-8 md:p-10 border border-[#e5d8d0]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] flex items-center justify-center text-[#fa7150]">
                    <Sparkles size={20} fill="currentColor" />
                  </div>
                  <h3 className="text-2xl font-black text-[#303330]">Chế Độ Chăm Sóc Đặc Biệt</h3>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#e5d8d0]">
                    <h4 className="font-black text-sm text-[#303330] mb-2 flex items-center gap-2">
                      <UtensilsCrossed size={16} className="text-[#fa7150]" /> Quy tắc ăn uống
                    </h4>
                    <p className="text-xs text-[#5a5550] leading-relaxed">{activePet.specialNotes || 'Chưa có ghi chú chăm sóc đặc biệt.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#e5d8d0] border-l-4 border-l-[#44683b]">
                      <h4 className="font-black text-sm text-[#303330] mb-2 flex items-center gap-2">
                        <Activity size={16} className="text-[#44683b]" /> Luyện tập thể chất
                      </h4>
                      <p className="text-xs text-[#5a5550] leading-relaxed">{activePet.feedingSchedule || 'Chạy bộ nhặt bóng ngoài trời 30 phút hằng ngày.'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#e5d8d0] border-l-4 border-l-[#a43e24]">
                      <h4 className="font-black text-sm text-[#303330] mb-2 flex items-center gap-2">
                        <Smile size={16} className="text-[#a43e24]" /> Tính cách & Thói quen
                      </h4>
                      <p className="text-xs text-[#5a5550] leading-relaxed">{activePet.foodType || 'Hạt dinh dưỡng cao cấp trộn thịt bò xay nhuyễn.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lịch sử tiêm chủng */}
              <div>
                <div className="flex items-center justify-between mb-8 px-2">
                  <h3 className="text-2xl font-black text-[#303330]">Lịch Sử Tiêm Chủng</h3>
                  <button className="text-[#fa7150] font-bold text-xs flex items-center gap-1.5 hover:underline cursor-pointer">
                    <FileText size={16} /> Tải Sổ Y Tế (PDF)
                  </button>
                </div>

                <div className="space-y-4">
                  {(activePet.vaccines || []).map((v, idx) => {
                    const isCompleted = v.status === 'COMPLETED'
                    return (
                      <div key={idx} className="flex gap-6 group">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white z-10 transition-transform ${
                            isCompleted ? 'bg-[#44683b]' : 'bg-[#fa7150]'
                          }`}>
                            {isCompleted ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          </div>
                          {activePet.vaccines && idx < activePet.vaccines.length - 1 && (
                            <div className="w-0.5 h-full bg-[#e5d8d0] mt-2" />
                          )}
                        </div>
                        
                        <div className={`bg-white flex-grow p-6 rounded-3xl border transition-all ${
                          isCompleted ? 'border-[#e5d8d0]' : 'border-[#fa7150]/30 shadow-md shadow-[#fa7150]/2'
                        }`}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-black text-base text-[#303330]">{v.name}</h4>
                              <p className="text-xs text-[#8a7e75] mt-1">Bác sĩ phụ trách: {v.doctor}</p>
                            </div>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                              isCompleted 
                                ? 'bg-[#d0fac0] text-[#2c4e24]' 
                                : 'bg-[#fdf0ec] text-[#a43e24]'
                            }`}>
                              {isCompleted ? 'Đã tiêm phòng' : 'Sắp đến hạn'}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-[#8a7e75] border-t border-[#e5d8d0]/60 pt-4">
                            <span className="flex items-center gap-1"><Calendar size={12} /> Ngày tiêm: {v.date}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> Lịch hẹn kế: {v.nextDate}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

          </section>
        )}

      </main>

    </div>
  )
}
