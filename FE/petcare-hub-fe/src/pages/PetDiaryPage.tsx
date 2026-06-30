import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useChatSocket } from '@/hooks/useChatSocket'
import {
  PawPrint,
  Clock,
  Building,
  User,
  Image as ImageIcon,
  Heart,
  ChevronRight,
  BookOpen,
  Camera,
  MessageSquare,
  Send
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

interface CommentType {
  id: string
  authorName: string
  content: string
  createdAt: string
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
  eating: string | null
  mood: string | null
  activity: string | null
  petNames: string[]
  likesCount: number
  isLikedByMe: boolean
  comments: CommentType[]
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
  
  // Comment inputs mapped by diaryId
  const [commentInputs, setCommentInputs] = useState<{[diaryId: string]: string}>({})

  const { status, connect, subscribeToDestination, disconnect } = useChatSocket()

  // Connect WebSocket
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // Subscribe to diaries real-time events
  useEffect(() => {
    if (status !== 'connected') return

    const unsub = subscribeToDestination('/topic/diaries', (wsMsg: any) => {
      const { type, diaryId, likesCount, comment } = wsMsg

      if (type === 'LIKE') {
        setDiaries(prev => prev.map(d => {
          if (d.id === diaryId) {
            return {
              ...d,
              likesCount: likesCount
            }
          }
          return d
        }))
      } else if (type === 'COMMENT') {
        setDiaries(prev => prev.map(d => {
          if (d.id === diaryId) {
            const exists = d.comments?.some((c: any) => c.id === comment.id)
            if (exists) return d
            return {
              ...d,
              comments: [...(d.comments || []), comment]
            }
          }
          return d
        }))
      } else if (type === 'DIARY_CREATE' || type === 'DIARY_UPDATE') {
        if (selectedPetId) {
          axiosInstance.get(`/api/diaries/pet/${selectedPetId}`)
            .then(res => setDiaries(res.data))
            .catch(console.error)
        }
      }
    })

    return () => unsub()
  }, [status, selectedPetId, subscribeToDestination])

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

  // Toggle Like API handler
  const handleToggleLike = async (diaryId: string) => {
    try {
      const res = await axiosInstance.post(`/api/diaries/${diaryId}/like`)
      const { likesCount, isLikedByMe } = res.data
      setDiaries(prev => prev.map(d => {
        if (d.id === diaryId) {
          return { ...d, likesCount, isLikedByMe }
        }
        return d
      }))
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  // Add Comment API handler
  const handleAddComment = async (diaryId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = commentInputs[diaryId]?.trim()
    if (!content) return

    try {
      const res = await axiosInstance.post(`/api/diaries/${diaryId}/comment`, { content })
      const newComment = res.data
      setDiaries(prev => prev.map(d => {
        if (d.id === diaryId) {
          const exists = d.comments?.some((c: any) => c.id === newComment.id)
          if (exists) return d
          return {
            ...d,
            comments: [...(d.comments || []), newComment]
          }
        }
        return d
      }))
      setCommentInputs(prev => ({ ...prev, [diaryId]: '' }))
    } catch (err) {
      console.error('Failed to post comment:', err)
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

                          {/* Custom typed Status Notes (Free-text notes) */}
                          {(entry.eating || entry.mood || entry.activity) && (
                            <div className="flex flex-wrap gap-2.5 mb-6 text-xs text-[#5a5550]">
                              {entry.eating && (
                                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#e5d8d0] bg-[#faf9f6] font-bold">
                                  🥣 Ăn uống: {entry.eating}
                                </span>
                              )}
                              {entry.mood && (
                                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#e5d8d0] bg-[#faf9f6] font-bold">
                                  🎭 Tâm trạng: {entry.mood}
                                </span>
                              )}
                              {entry.activity && (
                                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#e5d8d0] bg-[#faf9f6] font-bold">
                                  🏃‍♂️ Hoạt động: {entry.activity}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Attached Media Grid */}
                          {entry.attachedMediaUrls && entry.attachedMediaUrls.length > 0 && (
                            <div className="mb-6">
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

                          {/* ── SOCIAL ACTIONS BAR (Like & Comment Toggles) ── */}
                          <div className="flex items-center gap-6 pt-4 border-t border-stone-100 text-xs font-bold text-[#5d605c]">
                            {/* Like Button */}
                            <button
                              onClick={() => handleToggleLike(entry.id)}
                              className={`flex items-center gap-1.5 transition-all hover:scale-[1.05] cursor-pointer ${
                                entry.isLikedByMe ? 'text-rose-500' : 'hover:text-rose-500'
                              }`}
                            >
                              <Heart size={16} className={entry.isLikedByMe ? 'fill-rose-500 text-rose-500' : ''} />
                              <span>{entry.likesCount || 0} yêu thích</span>
                            </button>

                            {/* Comment Count / Icon */}
                            <div className="flex items-center gap-1.5">
                              <MessageSquare size={16} className="text-[#8a7e75]" />
                              <span>{entry.comments?.length || 0} bình luận</span>
                            </div>
                          </div>

                          {/* ── COMMENTS SECTION (Facebook style) ── */}
                          <div className="mt-5 pt-4 border-t border-stone-50 bg-[#faf9f6]/50 rounded-2xl p-4">
                            {/* Comments List */}
                            {entry.comments && entry.comments.length > 0 ? (
                              <div className="space-y-3.5 mb-4 max-h-60 overflow-y-auto pr-1">
                                {entry.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-2.5 items-start text-xs text-left">
                                    <div className="w-7 h-7 rounded-full bg-[#fa7150]/15 border border-[#fa7150]/20 flex items-center justify-center font-bold text-[10px] text-[#fa7150] shrink-0">
                                      {comment.authorName.charAt(0)}
                                    </div>
                                    <div className="bg-[#faf9f6] border border-[#e5d8d0]/60 p-2.5 rounded-2xl flex-grow max-w-[85%]">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-extrabold text-[#303330]">{comment.authorName}</span>
                                      </div>
                                      <p className="text-stone-600 font-normal leading-relaxed text-xs">{comment.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-[#8a7e75] italic mb-3">Chưa có bình luận nào. Hãy gửi lời hỏi thăm đến bé cưng!</p>
                            )}

                            {/* Comment Composer */}
                            <form 
                              onSubmit={(e) => handleAddComment(entry.id, e)}
                              className="flex gap-2 items-center"
                            >
                              <input
                                type="text"
                                value={commentInputs[entry.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                placeholder="Viết bình luận của bạn..."
                                className="flex-grow bg-white border border-[#e5d8d0] rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-[#fa7150] transition-colors"
                              />
                              <button
                                type="submit"
                                className="w-8 h-8 rounded-xl bg-[#fa7150] text-white flex items-center justify-center hover:bg-[#fa7150]/90 transition-colors shadow-md shadow-[#fa7150]/10 cursor-pointer"
                              >
                                <Send size={12} />
                              </button>
                            </form>
                          </div>

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
