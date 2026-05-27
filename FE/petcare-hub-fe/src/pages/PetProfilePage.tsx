import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PawPrint,
  Heart,
  PlusCircle,
  Sparkles,
  FileText,
  Calendar,
  Clock,
  UtensilsCrossed,
  Activity,
  Smile,
  CheckCircle2,
  AlertCircle,
  Plus,
  Compass,
  ChevronRight,
  MessageSquare
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
  const [activeTab, setActiveTab] = useState<'health' | 'habits' | 'bookings'>('health')

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await axiosInstance.get('/api/pets/my')
        const fetchedPets = response.data.map((p: any) => ({
          ...p,
          status: p.status || 'Tại nhà',
          personalityTags: p.personalityTags || ['Thân thiện', 'Chỉ trong nhà', 'Năng động'],
          specialNotes: p.specialNotes || 'Chế độ ăn nhạy cảm, cần hâm ấm nhẹ thức ăn trước khi cho ăn.',
          feedingSchedule: p.feedingSchedule || 'Hai bữa chính lúc 8:00 và 18:00. Đồ ăn nhẹ vào buổi trưa.',
          foodType: p.foodType || 'Thức ăn ướt không ngũ cốc (vị Cá hồi) trộn với topping đông khô.',
          vaccines: p.vaccines || [
            { name: 'Tiêm nhắc lại Dại', doctor: 'BS. Aris Thorne', status: 'COMPLETED', date: '14/08/2025', nextDate: '14/08/2026' },
            { name: 'Bạch cầu mèo (FeLV)', doctor: 'BS. Nguyễn Minh', status: 'WARNING', date: '01/05/2026', nextDate: '15/06/2026' }
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

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }
  const primaryGlow = { background: 'linear-gradient(135deg, #a43e24 0%, #ffac98 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 bg-[#faf9f6] border-b border-[#e1e3df] transition-all duration-300">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto w-full">
          <Link to="/" className="text-2xl font-black text-[#a43e24] tracking-tight font-headline flex items-center gap-2">
            <PawPrint className="text-[#a43e24]" />
            The Pet Sanctuary
          </Link>
          <div className="hidden md:flex items-center gap-8 font-medium">
            <Link to="/" className="text-stone-600 hover:text-[#a43e24] transition-all duration-300">Phòng</Link>
            <Link to="/hotels" className="text-stone-600 hover:text-[#a43e24] transition-all duration-300">Dịch vụ</Link>
            <Link to="/pets" className="text-[#a43e24] font-bold border-b-2 border-[#a43e24] pb-1">Nhật ký Thú cưng</Link>
            <span className="text-stone-600 cursor-default">Thành viên</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/partner/bookings" className="bg-[#a43e24] text-[#fff7f6] px-6 py-2 rounded-full font-medium transition-all hover:opacity-90 hover:scale-[1.02]">
              Lịch đặt phòng
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-8 pt-12 pb-24">
        
        {/* Header & Add Action */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 text-left">
          <div className="space-y-2">
            <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bảng điều khiển thành viên</span>
            <h1 className="text-5xl font-extrabold tracking-tight text-[#303330]">Gia đình Thú cưng</h1>
            <p className="text-[#5d605c] text-lg max-w-lg">Quản lý hồ sơ, lịch sử y tế và lịch chăm sóc cá nhân hóa cho những người bạn đồng hành yêu quý của bạn.</p>
          </div>
          <button 
            style={primaryGlow}
            className="text-[#fff7f6] px-8 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-transform shadow-lg shadow-[#a43e24]/10 cursor-pointer"
          >
            <PlusCircle size={20} />
            Thêm Thú cưng mới
          </button>
        </header>

        {/* Bento Grid: Pet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-20">
          {loading ? (
            <div className="col-span-full py-12 text-center text-stone-500 font-bold">Đang tải danh sách thú cưng...</div>
          ) : (
            pets.map((pet) => {
              const isSelected = selectedPetId === pet.id
              const petImage = pet.avatarUrl || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400'
              const borderAccentColor = pet.breed.toLowerCase().includes('mèo') ? 'border-[#c2ebb2]' : 'border-[#ffac98]'
              return (
                <div 
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`bg-white rounded-2xl p-6 transition-all cursor-pointer border-2 relative flex flex-col text-left ${
                    isSelected 
                      ? 'border-[#a43e24] ring-2 ring-[#a43e24]/10' 
                      : 'border-transparent hover:border-[#a43e24]/10'
                  }`}
                  style={sunlightShadow}
                >
                  <div className="relative mb-6">
                    <div className={`aspect-square rounded-xl overflow-hidden relative border-4 ${borderAccentColor}`}>
                      <img 
                        alt={pet.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                        src={petImage}
                      />
                      <div className="absolute inset-0 bg-[#a43e24]/5 opacity-0 hover:opacity-100 transition-opacity"></div>
                    </div>
                    {isSelected && (
                      <span className="absolute -bottom-3 -right-3 bg-[#ffac98] text-[#751c05] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-[#303330] font-headline">{pet.name}</h3>
                  <p className="text-[#5d605c] font-medium flex items-center gap-2 mb-2 mt-1">
                    <PawPrint size={14} className="text-[#a43e24]" />
                    {pet.breed}
                  </p>
                  <p className="text-xs font-bold text-[#395c30] bg-[#d0fac0]/50 px-2 py-1 rounded inline-block uppercase w-max">
                    {pet.ageYears} Tuổi
                  </p>
                </div>
              )
            })
          )}

          {/* Empty State / Add Placeholder */}
          <div className="bg-[#eeeeea]/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#b1b2af] hover:bg-[#eeeeea]/80 transition-colors cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-[#eeeeea] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="text-[#797b78] text-3xl" size={28} />
            </div>
            <p className="font-bold text-[#5d605c]">Thêm một người bạn</p>
            <p className="text-xs text-[#797b78] mt-1">Áp dụng giảm giá cho nhiều thú cưng</p>
          </div>
        </div>

        {/* Detailed View */}
        {activePet && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Sticky Profile Sidebar */}
            <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24 text-left">
              <div className="bg-white p-10 rounded-2xl overflow-hidden relative text-center border border-[#eeeeea]" style={sunlightShadow}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#d0fac0]/20 rounded-full -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <div className="w-48 h-48 rounded-full mx-auto border-8 border-[#c2ebb2] overflow-hidden mb-6 shadow-inner">
                    <img 
                      alt={activePet.name} 
                      className="w-full h-full object-cover" 
                      src={activePet.avatarUrl || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400'}
                    />
                  </div>
                  <h2 className="text-4xl font-black text-[#303330] font-headline">{activePet.name}</h2>
                  <p className="text-[#44683b] font-semibold mt-1">
                    Người bạn đồng hành {activePet.breed} đáng yêu
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-8">
                    {activePet.personalityTags?.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          idx % 2 === 0 
                            ? 'bg-[#eeeeea] text-[#5d605c]' 
                            : 'bg-[#feeadb] text-[#63564b]'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#44683b] text-[#ebffdf] p-8 rounded-2xl flex flex-col gap-4" style={sunlightShadow}>
                <h4 className="font-bold text-xl font-headline">Lưu trú hiện tại</h4>
                <p className="text-sm opacity-90 leading-relaxed">
                  {activePet.name} hiện đang tận hưởng chuyến nghỉ dưỡng của mình tại <span className="font-bold">Garden Suite</span>. Bé đã nhanh chóng hòa nhập và rất ngoan ngoãn!
                </p>
                <button className="bg-[#ebffdf] text-[#44683b] w-full py-3 rounded-full font-bold text-sm hover:opacity-90 transition-opacity">
                  Xem trực tiếp qua Camera
                </button>
              </div>
            </div>

            {/* Detailed Content with Tabs */}
            <div className="lg:col-span-8 space-y-8 text-left">
              
              {/* Navigation Tabs */}
              <div className="flex border-b border-[#b1b2af]/30 gap-8 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('health')}
                  className={`py-4 px-2 font-headline font-bold text-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'health' 
                      ? 'text-[#a43e24] border-b-3 border-[#a43e24]' 
                      : 'text-[#5d605c] hover:text-[#a43e24]'
                  }`}
                >
                  <Heart size={20} />
                  Sức khỏe
                </button>
                <button 
                  onClick={() => setActiveTab('habits')}
                  className={`py-4 px-2 font-headline font-bold text-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'habits' 
                      ? 'text-[#a43e24] border-b-3 border-[#a43e24]' 
                      : 'text-[#5d605c] hover:text-[#a43e24]'
                  }`}
                >
                  <Compass size={20} />
                  Thói quen
                </button>
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className={`py-4 px-2 font-headline font-bold text-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === 'bookings' 
                      ? 'text-[#a43e24] border-b-3 border-[#a43e24]' 
                      : 'text-[#5d605c] hover:text-[#a43e24]'
                  }`}
                >
                  <Clock size={20} />
                  Lịch sử lưu trú
                </button>
              </div>

              {/* Tab Content: Sức khỏe */}
              {activeTab === 'health' && (
                <div className="space-y-10 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#f4f4f0] p-6 rounded-xl border-l-4 border-[#a43e24]">
                      <span className="text-xs font-black text-[#a43e24] uppercase tracking-widest mb-2 block">Cân nặng hiện tại</span>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-headline font-black">{activePet.weightKg}</span>
                        <span className="text-lg font-bold text-[#5d605c] mb-1">kg</span>
                      </div>
                      <p className="text-xs text-[#5d605c] mt-2 font-medium">Ghi nhận định kỳ gần nhất</p>
                    </div>
                    <div className="bg-[#f4f4f0] p-6 rounded-xl border-l-4 border-[#44683b]">
                      <span className="text-xs font-black text-[#44683b] uppercase tracking-widest mb-2 block">Tuổi</span>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-headline font-black">{activePet.ageYears}</span>
                        <span className="text-lg font-bold text-[#5d605c] mb-1">năm</span>
                      </div>
                      <p className="text-xs text-[#5d605c] mt-2 font-medium">Sinh nhật được cập nhật tự động</p>
                    </div>
                  </div>

                  {/* Vaccination Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-extrabold font-headline">Lịch tiêm phòng</h3>
                      <button className="text-[#a43e24] font-bold text-sm flex items-center gap-1 hover:underline">
                        <FileText size={18} />
                        Cập nhật hồ sơ y tế
                      </button>
                    </div>

                    <div className="space-y-4">
                      {activePet.vaccines?.map((vaccine, idx) => {
                        const isCompleted = vaccine.status === 'COMPLETED'
                        return (
                          <div 
                            key={idx}
                            className={`bg-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
                              isCompleted ? 'border-[#b1b2af]/20' : 'border-2 border-[#a43e24]/10'
                            }`}
                            style={sunlightShadow}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-[#d0fac0] text-[#44683b]' : 'bg-[#ffac98] text-[#a43e24]'
                              }`}>
                                {isCompleted ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-[#303330]">{vaccine.name}</h4>
                                <p className="text-sm text-[#5d605c]">Thực hiện bởi {vaccine.doctor}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                                isCompleted ? 'text-[#2c4e24] bg-[#d0fac0]' : 'text-[#a43e24] bg-[#ffac98]'
                              }`}>
                                {isCompleted ? 'Đã hoàn thành' : 'Sắp đến hạn'}
                              </span>
                              <p className="text-xs font-semibold text-[#797b78] mt-2">
                                {isCompleted ? `Hạn tiếp theo: ${vaccine.nextDate}` : 'Còn 14 ngày'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Thói quen */}
              {activeTab === 'habits' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl border border-[#b1b2af]/20" style={sunlightShadow}>
                    <div className="flex items-center gap-3 mb-6">
                      <UtensilsCrossed className="text-[#a43e24]" size={22} />
                      <h4 className="font-headline font-bold text-xl">Hồ sơ ăn uống</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h5 className="font-bold text-sm text-[#44683b] uppercase tracking-widest mb-3">Loại thức ăn ưa thích</h5>
                        <p className="text-[#5d605c] leading-relaxed">{activePet.foodType}</p>
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-[#44683b] uppercase tracking-widest mb-3">Lịch trình & Khẩu phần</h5>
                        <p className="text-[#5d605c] leading-relaxed">{activePet.feedingSchedule}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f4f4f0] p-8 rounded-xl">
                    <div className="flex items-center gap-3 mb-6">
                      <Smile className="text-[#6a5d51]" size={22} />
                      <h4 className="font-headline font-bold text-xl">Cá tính & Đặc điểm</h4>
                    </div>
                    <div className="space-y-4 text-[#5d605c] leading-relaxed">
                      <p>
                        {activePet.name} là một bé cưng vô cùng ngoan ngoãn. Bé có tính cách thân thiện, rất thích được vuốt ve và nhanh chóng làm thân với các nhân viên chăm sóc. Bé thích vận động nhẹ nhàng và ngủ sâu giấc.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="bg-[#e1e3df] px-3 py-1 rounded text-xs font-semibold text-[#303330]">Thân thiện</span>
                        <span className="bg-[#e1e3df] px-3 py-1 rounded text-xs font-semibold text-[#303330]">Dễ gần</span>
                        <span className="bg-[#e1e3df] px-3 py-1 rounded text-xs font-semibold text-[#303330]">Ngoan ngoãn</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Lịch sử lưu trú */}
              {activeTab === 'bookings' && (
                <div className="space-y-4 animate-fadeIn">
                  <h4 className="font-headline font-bold text-xl mb-4 px-2">Các lần đặt phòng gần đây</h4>
                  <div className="bg-white p-6 rounded-xl flex items-center justify-between border border-[#b1b2af]/20" style={sunlightShadow}>
                    <div>
                      <p className="font-bold text-[#303330]">Phòng Cozy Corner Suite</p>
                      <p className="text-xs text-[#5d605c]">12 tháng 8 — 18 tháng 8, 2025</p>
                    </div>
                    <button className="text-[#a43e24] font-bold text-sm hover:underline flex items-center gap-1">
                      Xem báo cáo <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-xl flex items-center justify-between border border-[#b1b2af]/20" style={sunlightShadow}>
                    <div>
                      <p className="font-bold text-[#303330]">Phòng Playful Paws Room</p>
                      <p className="text-xs text-[#5d605c]">05 tháng 5 — 12 tháng 5, 2025</p>
                    </div>
                    <button className="text-[#a43e24] font-bold text-sm hover:underline flex items-center gap-1">
                      Xem báo cáo <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* Floating Chat Support */}
      <button 
        style={primaryGlow} 
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center text-[#fff7f6] z-50 hover:scale-110 transition-transform shadow-lg cursor-pointer"
      >
        <MessageSquare size={28} />
      </button>

      {/* Footer */}
      <footer className="bg-[#f4f4f0] border-t border-[#b1b2af]/20 py-12 px-8 text-sm text-[#5d605c] mt-24 text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto w-full">
          <div className="space-y-4">
            <div className="text-xl font-bold text-[#303330] font-headline">The Pet Sanctuary</div>
            <p className="text-stone-600">Tạo ra những kỳ nghỉ cá nhân hóa và hạnh phúc nhất cho những người bạn bốn chân của bạn.</p>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold text-[#303330]">Khám phá</h5>
            <ul class="space-y-2">
              <li><Link to="/" className="hover:text-[#a43e24]">Về chúng tôi</Link></li>
              <li><Link to="/hotels" className="hover:text-[#a43e24]">Các khách sạn</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold text-[#303330]">Hỗ trợ</h5>
            <ul class="space-y-2">
              <li><span className="cursor-pointer hover:text-[#a43e24]">Trung tâm giúp đỡ</span></li>
              <li><span className="cursor-pointer hover:text-[#a43e24]">Điều khoản & Chính sách</span></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold text-[#303330]">Bản tin</h5>
            <p className="text-stone-600">Nhận những mẹo chăm sóc thú cưng hữu ích hàng tuần.</p>
            <div className="flex gap-2">
              <input className="bg-white rounded-md border-none px-4 py-2 w-full text-xs placeholder:text-stone-400 focus:outline-[#a43e24]" placeholder="Địa chỉ Email" type="email"/>
              <button className="bg-[#a43e24] text-white px-4 py-2 rounded-md font-bold text-xs hover:opacity-90">Đăng ký</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto w-full mt-12 pt-8 border-t border-[#b1b2af]/20 text-center text-stone-500">
          © 2026 The Pet Sanctuary. Bảo lưu mọi quyền.
        </div>
      </footer>

    </div>
  )
}
