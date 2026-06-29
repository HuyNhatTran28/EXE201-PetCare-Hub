import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import {
  PawPrint,
  Calendar,
  Utensils,
  Smile,
  Zap,
  Clock,
  Building,
  User,
  Image as ImageIcon,
  Heart,
  ChevronRight,
  BookOpen,
  Camera
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface PetType {
  id: string
  name: string
  breed: string
  ageYears: number
  weightKg: number
  avatarUrl: string | null
  species?: string
}

interface DiaryEntry {
  id: string
  bookingId: string | null
  hotelName: string
  staffName: string
  entryTime: string
  entryTitle: string
  entryContent: string
  attachedMediaUrls: string[]
  eating: 'GOOD' | 'POOR' | 'NO_EAT' | null
  mood: 'HAPPY' | 'ANXIOUS' | 'TIRED' | null
  activity: 'HIGH' | 'NORMAL' | 'LOW' | null
  petNames: string[]
}

const sunlightShadow = {
  boxShadow: '0 20px 40px -15px rgba(164, 62, 36, 0.08), 0 15px 25px -10px rgba(0, 0, 0, 0.04)'
}

export const PetDiaryPage = () => {
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('')
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [loadingPets, setLoadingPets] = useState(true)
  const [loadingDiaries, setLoadingDiaries] = useState(false)
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null) // Lightbox

  useEffect(() => {
    if (activeMediaUrl) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activeMediaUrl])

  // Fetch all pets owned by owner
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await axiosInstance.get('/api/pets/my')
        setPets(response.data)
        if (response.data.length > 0) {
          setSelectedPetId(response.data[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch pets:', err)
      } finally {
        setLoadingPets(false)
      }
    }
    fetchPets()
  }, [])

  // Fetch diaries whenever the selected pet changes
  useEffect(() => {
    if (!selectedPetId) return
    const fetchDiaries = async () => {
      setLoadingDiaries(true)
      try {
        const response = await axiosInstance.get(`/api/diaries/pet/${selectedPetId}`)
        setDiaries(response.data)
      } catch (err) {
        console.error('Failed to fetch diaries:', err)
      } finally {
        setLoadingDiaries(false)
      }
    }
    fetchDiaries()
  }, [selectedPetId])

  const selectedPet = pets.find(p => p.id === selectedPetId)

  // Status Translators & Styles
  const getEatingStyle = (eating: string | null) => {
    switch (eating) {
      case 'GOOD':
        return { label: 'Ăn ngoan miệng', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
      case 'POOR':
        return { label: 'Ăn ít', color: 'bg-amber-50 text-amber-700 border-amber-100' }
      case 'NO_EAT':
        return { label: 'Bỏ bữa', color: 'bg-rose-50 text-rose-700 border-rose-100' }
      default:
        return { label: 'Chưa cập nhật', color: 'bg-stone-50 text-stone-500 border-stone-100' }
    }
  }

  const getMoodStyle = (mood: string | null) => {
    switch (mood) {
      case 'HAPPY':
        return { label: 'Vui vẻ, quấn quýt', color: 'bg-pink-50 text-pink-700 border-pink-100' }
      case 'ANXIOUS':
        return { label: 'Hơi lo lắng', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' }
      case 'TIRED':
        return { label: 'Mệt mỏi', color: 'bg-amber-50 text-amber-700 border-amber-100' }
      default:
        return { label: 'Chưa cập nhật', color: 'bg-stone-50 text-stone-500 border-stone-100' }
    }
  }

  const getActivityStyle = (activity: string | null) => {
    switch (activity) {
      case 'HIGH':
        return { label: 'Năng động, chơi khỏe', color: 'bg-sky-50 text-sky-700 border-sky-100' }
      case 'NORMAL':
        return { label: 'Bình thường', color: 'bg-stone-50 text-stone-700 border-stone-200' }
      case 'LOW':
        return { label: 'Ít vận động', color: 'bg-orange-50 text-orange-700 border-orange-100' }
      default:
        return { label: 'Chưa cập nhật', color: 'bg-stone-50 text-stone-500 border-stone-100' }
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) return timeStr
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return timeStr
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-body">
      <Header />

      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex-grow">
        {/* Page Title Header */}
        <div className="mb-10 text-left">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block px-3.5 py-1.5 bg-[#feeadb] text-[#a43e24] rounded-full text-xs font-bold uppercase tracking-widest">
              Khoảnh Khắc Của Bé
            </span>
          </div>
          <h1 className="text-4xl font-black text-[#303330] font-headline tracking-tight">
            Nhật Ký Thú Cưng
          </h1>
          <p className="text-[#5d605c] mt-2 text-sm max-w-2xl">
            Nơi lưu giữ những hình ảnh, bữa ăn, giấc ngủ và những trò đùa tinh nghịch của các bé cưng được bảo mẫu cập nhật từng giờ khi gửi tại cửa hàng.
          </p>
        </div>

        {loadingPets ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a43e24]"></div>
          </div>
        ) : pets.length === 0 ? (
          /* Empty Pets State */
          <div className="bg-white rounded-3xl p-12 border border-[#eeeeea] text-center max-w-lg mx-auto" style={sunlightShadow}>
            <div className="w-16 h-16 bg-[#feeadb] rounded-full flex items-center justify-center mx-auto mb-6 text-[#a43e24]">
              <PawPrint size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#303330] mb-3 font-headline">Chưa có hồ sơ thú cưng</h3>
            <p className="text-stone-500 text-xs leading-relaxed mb-6">
              Bạn cần tạo hồ sơ cho bé cưng của mình trước khi khách sạn có thể bắt đầu ghi nhận nhật ký lưu trú và hoạt động chăm sóc.
            </p>
            <a
              href="/pets"
              className="inline-block px-6 py-3 bg-[#a43e24] hover:bg-[#a43e24]/90 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all"
            >
              Tạo hồ sơ ngay
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT COLUMN: PET SELECTOR SIDEBAR ── */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 text-left">
              <div className="bg-white p-8 rounded-3xl border border-[#eeeeea] shadow-sm" style={sunlightShadow}>
                <h4 className="font-headline font-black text-lg text-[#303330] mb-4">Danh sách thú cưng</h4>
                <div className="space-y-3">
                  {pets.map((pet) => {
                    const isSelected = pet.id === selectedPetId
                    return (
                      <button
                        key={pet.id}
                        onClick={() => setSelectedPetId(pet.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border text-left ${
                          isSelected
                            ? 'border-[#a43e24] bg-[#fffcfb] shadow-sm'
                            : 'border-[#eeeeea] hover:border-[#b1b2af]/40 bg-white'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 ${
                          isSelected ? 'border-[#a43e24]' : 'border-stone-200'
                        }`}>
                          {pet.avatarUrl ? (
                            <img
                              alt={pet.name}
                              className="w-full h-full object-cover"
                              src={pet.avatarUrl}
                            />
                          ) : (
                            <div className="w-full h-full bg-[#fdf0ec] text-[#fa7150] flex items-center justify-center font-bold">
                              {pet.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h5 className="font-headline font-bold text-sm text-[#303330] truncate">
                            {pet.name}
                          </h5>
                          <p className="text-xs text-[#8a7e75] truncate mt-0.5">
                            {pet.breed} • {pet.ageYears} tuổi
                          </p>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`transition-all ${isSelected ? 'text-[#a43e24] translate-x-1' : 'text-[#8a7e75]'}`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: DIARY TIMELINE ── */}
            <div className="lg:col-span-8 text-left">
              {loadingDiaries ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#a43e24]"></div>
                </div>
              ) : diaries.length === 0 ? (
                /* Empty Diary State */
                <div className="bg-white rounded-3xl p-12 border border-[#eeeeea] text-center" style={sunlightShadow}>
                  <div className="w-16 h-16 bg-[#ebffdf] rounded-full flex items-center justify-center mx-auto mb-6 text-[#44683b]">
                    <BookOpen size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-[#303330] mb-3 font-headline">Chưa có khoảnh khắc nào</h3>
                  <p className="text-stone-500 text-xs leading-relaxed max-w-sm mx-auto">
                    Hiện chưa có cập nhật nhật ký hoạt động nào cho bé <span className="font-bold text-[#a43e24]">{selectedPet?.name}</span>. Khi bé có kỳ nghỉ mát hoặc gửi chăm sóc tại tiệm, các hoạt động đáng yêu của bé sẽ hiển thị đầy đủ ở đây!
                  </p>
                </div>
              ) : (
                /* Diary Timeline List */
                <div className="relative border-l-2 border-[#f0e4de] ml-6 pl-8 space-y-10">
                  {diaries.map((entry) => {
                    const eatingStyle = getEatingStyle(entry.eating)
                    const moodStyle = getMoodStyle(entry.mood)
                    const activityStyle = getActivityStyle(entry.activity)

                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline Icon / Dot */}
                        <div className="absolute -left-[45px] top-1.5 bg-[#a43e24] text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#faf9f6] shadow-sm">
                          <Camera size={14} />
                        </div>

                        {/* Diary Card */}
                        <div className="bg-white rounded-3xl p-8 border border-[#eeeeea] shadow-sm hover:shadow-md transition-shadow" style={sunlightShadow}>
                          
                          {/* Header Metadata */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-5">
                            <div className="flex items-center gap-2.5 text-xs text-[#8a7e75] font-semibold">
                              <span className="flex items-center gap-1">
                                <Clock size={14} className="text-[#a43e24]" />
                                {formatTime(entry.entryTime)}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="flex items-center gap-1 text-[#44683b]">
                                <Building size={14} />
                                {entry.hotelName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/60 px-3 py-1 rounded-full text-[10px] font-bold text-[#5d605c]">
                              <User size={12} className="text-[#8a7e75]" />
                              Bảo mẫu: {entry.staffName}
                            </div>
                          </div>

                          {/* Content */}
                          <h3 className="font-headline font-black text-xl text-[#303330] mb-3 leading-snug">
                            {entry.entryTitle}
                          </h3>
                          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                            {entry.entryContent}
                          </p>

                          {/* Health & Habits Badges */}
                          <div className="flex flex-wrap gap-2.5 mb-6">
                            {entry.eating && (
                              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${eatingStyle.color}`}>
                                <Utensils size={12} />
                                {eatingStyle.label}
                              </span>
                            )}
                            {entry.mood && (
                              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${moodStyle.color}`}>
                                <Smile size={12} />
                                {moodStyle.label}
                              </span>
                            )}
                            {entry.activity && (
                              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${activityStyle.color}`}>
                                <Zap size={12} />
                                {activityStyle.label}
                              </span>
                            )}
                          </div>

                          {/* Attached Media Grid */}
                          {entry.attachedMediaUrls && entry.attachedMediaUrls.length > 0 && (
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a7e75] mb-3 flex items-center gap-1.5">
                                <ImageIcon size={12} />
                                Khoảnh khắc ghi lại ({entry.attachedMediaUrls.length})
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {entry.attachedMediaUrls.map((url, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setActiveMediaUrl(url)}
                                    className="aspect-square rounded-2xl overflow-hidden cursor-zoom-in border border-stone-100 hover:border-[#a43e24]/40 transition-all hover:scale-[1.02] bg-[#faf9f6]"
                                  >
                                    <img
                                      alt={`Moments of stay`}
                                      className="w-full h-full object-cover"
                                      src={url}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Lightbox / Media Preview Modal */}
      {activeMediaUrl && (
        <div
          onClick={() => setActiveMediaUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl">
            <img
              alt="Lightbox view"
              className="w-full h-full object-contain"
              src={activeMediaUrl}
            />
          </div>
        </div>
      )}
    </div>
  )
}
