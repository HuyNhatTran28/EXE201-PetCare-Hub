import { useState, useEffect, useCallback } from 'react'
import {
  Building, Camera, Search, PawPrint, Heart, MessageSquare, Send, Loader2, History, XCircle, CheckCircle, AlertCircle, HelpCircle
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useHotelStore } from '@/store/hotelStore'
import { useLocation } from 'react-router-dom'

interface HotelOption {
  id: string
  name: string
}


const formatDiaryTime = (timeStr: string) => {
  try {
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return timeStr
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return timeStr
  }
}

const translatePillValue = (val: string) => {
  if (!val) return ''
  const upper = val.toUpperCase().trim()
  switch (upper) {
    case 'EXCELLENT': return 'Xuất sắc'
    case 'GOOD': return 'Tốt'
    case 'NORMAL': return 'Bình thường'
    case 'POOR': return 'Kém'
    
    case 'CALM': return 'Bình tĩnh'
    case 'HAPPY': return 'Vui vẻ'
    case 'SAD': return 'Buồn bã'
    case 'HYPERACTIVE': return 'Tăng động'
    case 'SCARED': return 'Sợ hãi'
    case 'PLAYFUL': return 'Tinh nghịch'
    
    case 'ACTIVE': return 'Năng động'
    case 'RESTING': return 'Đang nghỉ ngơi'
    case 'SLEEPING': return 'Đang ngủ'
    case 'WALKING': return 'Đi dạo'
    case 'PLAYING': return 'Đang chơi đùa'
    
    default: return val
  }
}

export const StaffDiaryPage = () => {
  const { user } = useAuthStore()
  const isPartner = user?.role === 'PARTNER'
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const queryBookingId = searchParams.get('bookingId')

  const [hotels, setHotels]               = useState<HotelOption[]>([])
  const [hotelsLoading, setHotelsLoading] = useState(false)
  const { selectedHotelId, setSelectedHotelId } = useHotelStore()

  // Staying pets lists
  const [stayingPets, setStayingPets]     = useState<any[]>([])
  const [loadingPets, setLoadingPets]     = useState(false)
  const [petSearch, setPetSearch]         = useState('')

  // State for Pet Diary Modal (Composer)
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null)
  const [diaryBookingId, setDiaryBookingId] = useState<string | null>(null)
  const [diaryTitle, setDiaryTitle]         = useState('')
  const [diaryContent, setDiaryContent]     = useState('')
  const [diaryEating, setDiaryEating]       = useState('')
  const [diaryMood, setDiaryMood]           = useState('')
  const [diaryActivity, setDiaryActivity]   = useState('')
  const [diaryImageUrls, setDiaryImageUrls] = useState<string[]>([])
  const [uploadLoading, setUploadLoading]   = useState(false)
  const [popup, setPopup] = useState<{ type: 'success' | 'error' | 'confirm'; message: string; onConfirm?: () => void } | null>(null)

  // State for selected pet diaries (Care Timeline Feed)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedPetId, setSelectedPetId]         = useState<string | null>(null)
  const [selectedPetName, setSelectedPetName]     = useState('')
  const [diaries, setDiaries]                     = useState<any[]>([])
  const [loadingDiaries, setLoadingDiaries]       = useState(false)
  const [commentInputs, setCommentInputs]         = useState<{[diaryId: string]: string}>({})

  // Load hotels (PARTNER only)
  useEffect(() => {
    if (!isPartner) return
    setHotelsLoading(true)
    axiosInstance
      .get('/api/hotels/my', { params: { page: 0, size: 20, sort: [] } })
      .then(res => {
        const list: HotelOption[] = (res.data.content ?? []).map((h: HotelOption) => ({
          id: h.id,
          name: h.name,
        }))
        setHotels(list)
        if (list.length > 0) setSelectedHotelId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setHotelsLoading(false))
  }, [isPartner, setSelectedHotelId])

  // Fetch staying pets
  const fetchStayingPets = useCallback(async () => {
    if (!selectedHotelId) return
    setLoadingPets(true)
    try {
      const res = await axiosInstance.get(`/api/bookings/hotel/${selectedHotelId}`)
      const bookings = res.data.content || []
      const checkedIn = bookings.filter((b: any) => b.status === 'CHECKED_IN')
      setStayingPets(checkedIn)
    } catch (err) {
      console.error('Failed to fetch staying pets:', err)
    } finally {
      setLoadingPets(false)
    }
  }, [selectedHotelId])

  useEffect(() => {
    if (selectedHotelId) {
      fetchStayingPets()
    } else {
      setStayingPets([])
    }
    // Reset selected pet when hotel changes
    setSelectedBookingId(null)
    setSelectedPetId(null)
    setSelectedPetName('')
    setDiaries([])
  }, [selectedHotelId, fetchStayingPets])

  // Fetch diaries for selected pet
  const fetchPetDiaries = useCallback(async (petId: string) => {
    setLoadingDiaries(true)
    try {
      const res = await axiosInstance.get(`/api/diaries/pet/${petId}`)
      setDiaries(res.data || [])
    } catch (err) {
      console.error('Failed to fetch pet diaries:', err)
    } finally {
      setLoadingDiaries(false)
    }
  }, [])

  // Auto-select booking / pet from query params
  useEffect(() => {
    if (queryBookingId && stayingPets.length > 0) {
      const found = stayingPets.find((b: any) => b.id === queryBookingId)
      if (found) {
        const pet = found.pets?.[0]
        if (pet) {
          setSelectedBookingId(found.id)
          setSelectedPetId(pet.id)
          setSelectedPetName(pet.name || 'Thú cưng')
          fetchPetDiaries(pet.id)
        }
      }
    }
  }, [queryBookingId, stayingPets, fetchPetDiaries])

  // Listen to WebSocket real-time reaction/comment notifications broadcasted by backend
  useEffect(() => {
    const handleRealtimeDiaryEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return

      const { type, diaryId, likesCount, comment } = detail

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
        if (selectedBookingId === detail.bookingId && selectedPetId) {
          fetchPetDiaries(selectedPetId)
        }
      }
    }

    window.addEventListener('petcare-diary-realtime', handleRealtimeDiaryEvent)
    return () => {
      window.removeEventListener('petcare-diary-realtime', handleRealtimeDiaryEvent)
    }
  }, [selectedBookingId, selectedPetId, fetchPetDiaries])

  // Toggle Like
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

      const author = user?.fullName || 'Bảo mẫu'
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: isLikedByMe ? 'Đã yêu thích nhật ký' : 'Đã bỏ yêu thích',
          message: `${author} đã ${isLikedByMe ? 'thả tim' : 'bỏ tim'} nhật ký chăm sóc của bé.`,
          type: 'like',
          bookingId: selectedBookingId,
          hotelId: selectedHotelId
        }
      }))
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }

  // Add Comment
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

      const author = user?.fullName || 'Bảo mẫu'
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: 'Đăng bình luận thành công',
          message: `${author} đã phản hồi: "${content}"`,
          type: 'comment',
          bookingId: selectedBookingId,
          hotelId: selectedHotelId
        }
      }))
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  // Save New/Edited Diary (Composer)
  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diaryBookingId) return
    try {
      const payload = {
        bookingId: diaryBookingId,
        entryTitle: diaryTitle,
        entryContent: diaryContent,
        eating: diaryEating,
        mood: diaryMood,
        activity: diaryActivity,
        attachedMediaUrls: diaryImageUrls
      }
      if (editingDiaryId) {
        await axiosInstance.put(`/api/diaries/${editingDiaryId}`, payload)
        setPopup({ type: 'success', message: 'Đã sửa nhật ký của bé thành công!' })
      } else {
        await axiosInstance.post('/api/diaries', payload)
        setPopup({ type: 'success', message: 'Đã cập nhật nhật ký cho bé thành công!' })
      }
      
      setShowDiaryModal(false)
      setEditingDiaryId(null)

      // Re-fetch diaries if we composer for currently selected pet
      if (selectedBookingId === diaryBookingId && selectedPetId) {
        fetchPetDiaries(selectedPetId)
      }

      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: editingDiaryId ? 'Đã Chỉnh Sửa Nhật Ký' : 'Đăng Nhật Ký Thành Công',
          message: editingDiaryId 
            ? `Nhật ký chăm sóc của bé đã được cập nhật thành công.` 
            : `Nhật ký chăm sóc "${diaryTitle || 'Không tiêu đề'}" đã được gửi tới chủ nuôi.`,
          type: 'comment',
          bookingId: diaryBookingId,
          hotelId: selectedHotelId
        }
      }))
    } catch (err: any) {
      setPopup({ type: 'error', message: err.response?.data?.message || 'Không thể lưu nhật ký.' })
    }
  }

  // Edit / Delete Handlers
  const handleOpenEditModal = (diary: any) => {
    setEditingDiaryId(diary.id)
    setDiaryBookingId(diary.bookingId)
    setDiaryTitle(diary.entryTitle || '')
    setDiaryContent(diary.entryContent || '')
    setDiaryEating(diary.eating || '')
    setDiaryMood(diary.mood || '')
    setDiaryActivity(diary.activity || '')
    setDiaryImageUrls(diary.attachedMediaUrls || [])
    setShowDiaryModal(true)
  }

  const handleCloseDiaryModal = () => {
    setShowDiaryModal(false)
    setEditingDiaryId(null)
  }

  const handleDeleteDiary = (diaryId: string) => {
    setPopup({
      type: 'confirm',
      message: 'Bạn có chắc chắn muốn xóa bài viết nhật ký này không?',
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/api/diaries/${diaryId}`)
          setPopup({ type: 'success', message: 'Đã xóa nhật ký thành công!' })
          if (selectedPetId) {
            fetchPetDiaries(selectedPetId)
          }
        } catch (err: any) {
          setPopup({ type: 'error', message: err.response?.data?.message || 'Không thể xóa nhật ký.' })
        }
      }
    })
  }

  // Filter staying pets
  const filteredPets = stayingPets.filter(b => {
    const petNames = b.pets?.map((p: any) => p.name).join(', ').toLowerCase() || ''
    const oName = b.ownerName?.toLowerCase() || ''
    const query = petSearch.toLowerCase()
    return petNames.includes(query) || oName.includes(query)
  })

  const handleSelectPet = (bookingId: string, petId: string, petName: string) => {
    setSelectedBookingId(bookingId)
    setSelectedPetId(petId)
    setSelectedPetName(petName)
    fetchPetDiaries(petId)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-left bg-[#faf9f6]">

      {/* ── PARTNER: Hotel selector ──────────────────────────────────────── */}
      {isPartner && (
        <div className="flex items-center gap-4 bg-white border-b border-[#e5d8d0] px-6 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Building size={16} className="text-[#fa7150]" />
            <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Chọn cơ sở:</span>
            {hotelsLoading ? (
              <Loader2 size={14} className="animate-spin text-[#fa7150]" />
            ) : hotels.length === 0 ? (
              <span className="text-xs text-amber-600 font-bold">Chưa có cơ sở nào</span>
            ) : (
              <select
                value={selectedHotelId ?? ''}
                onChange={e => setSelectedHotelId(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-[#303330] focus:outline-none cursor-pointer hover:text-[#fa7150] transition-colors"
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ── Main Layout ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Staying Pets Panel (Bé Đang Lưu Trú) ────────────────────── */}
        {selectedHotelId && (
          <div className="w-80 border-r border-[#e5d8d0] flex flex-col bg-white shrink-0">
            {/* Title */}
            <div className="px-5 py-4 border-b border-[#e5d8d0] shrink-0">
              <h3 className="font-black text-[#303330] text-sm flex items-center gap-2">
                <PawPrint size={16} className="text-[#fa7150]" />
                Bé Đang Lưu Trú ({stayingPets.length})
              </h3>
            </div>

            {/* Pet Search */}
            <div className="px-4 py-3 border-b border-[#e5d8d0] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7e75]" size={14} />
                <input
                  type="text"
                  placeholder="Tìm kiếm bé cưng, chủ nuôi..."
                  value={petSearch}
                  onChange={e => setPetSearch(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-xl py-2 pl-9 pr-3 text-[11px] font-semibold focus:outline-none focus:border-[#fa7150]"
                />
              </div>
            </div>

            {/* Pets List */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-[#faf9f6]/30">
              {loadingPets ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 size={20} className="animate-spin text-[#fa7150]" />
                </div>
              ) : filteredPets.length === 0 ? (
                <div className="text-center py-10 text-[#8a7e75]">
                  <PawPrint size={24} className="mx-auto mb-2 text-[#e5d8d0]" />
                  <p className="text-[10px] font-bold">Không có bé nào đang lưu trú</p>
                </div>
              ) : (
                filteredPets.map((b: any) => {
                  const pet = b.pets?.[0]
                  const petName = pet?.name || 'Thú cưng'
                  const active = selectedBookingId === b.id

                  return (
                    <div 
                      key={b.id} 
                      onClick={() => handleSelectPet(b.id, pet.id, petName)}
                      className={`border rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#fa7150] transition-all cursor-pointer ${
                        active 
                          ? 'bg-[#fa7150]/5 border-[#fa7150] ring-1 ring-[#fa7150]/20' 
                          : 'bg-white border-[#e5d8d0]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          active ? 'bg-[#fa7150] text-white' : 'bg-[#fa7150]/10 text-[#fa7150]'
                        }`}>
                          {petName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h4 className="font-extrabold text-xs text-[#303330] truncate">{petName}</h4>
                          <p className="text-[10px] text-[#8a7e75] truncate mt-0.5">Chủ nuôi: {b.ownerName}</p>
                          <p className="text-[9px] text-emerald-600 bg-emerald-50 w-fit px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mt-1">{b.roomTypeName}</p>
                        </div>
                      </div>

                      {/* Composer quick action inside card */}
                      <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-[#e5d8d0]/40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingDiaryId(null)
                            setDiaryBookingId(b.id)
                            setDiaryTitle('Cập nhật nhật ký chăm sóc')
                            setDiaryContent('')
                            setDiaryEating('')
                            setDiaryMood('')
                            setDiaryActivity('')
                            setDiaryImageUrls([])
                            setShowDiaryModal(true)
                          }}
                          className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg py-1 px-2.5 text-[9px] font-black uppercase cursor-pointer transition-colors"
                        >
                          Nhật ký
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── RIGHT: Care Timeline Feed (Replacing chat middle/right layout) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#faf9f6] h-full overflow-hidden">
          {selectedPetId ? (
            <div className="flex-grow flex flex-col h-full overflow-hidden bg-white">
              {/* Header block */}
              <div className="px-6 py-4 border-b border-[#e5d8d0] flex items-center justify-between shrink-0 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                <div>
                  <h2 className="font-black text-[#303330] text-sm flex items-center gap-2">
                    <History size={16} className="text-[#fa7150]" />
                    Nhật ký chăm sóc của {selectedPetName}
                  </h2>
                  <p className="text-[10px] text-[#8a7e75] mt-0.5 font-bold uppercase tracking-wide">Đơn đặt: #{selectedBookingId?.substring(0, 8).toUpperCase()}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingDiaryId(null)
                    setDiaryBookingId(selectedBookingId)
                    setDiaryTitle('Cập nhật nhật ký chăm sóc')
                    setDiaryContent('')
                    setDiaryEating('')
                    setDiaryMood('')
                    setDiaryActivity('')
                    setDiaryImageUrls([])
                    setShowDiaryModal(true)
                  }}
                  className="flex items-center gap-1.5 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-sm shadow-[#fa7150]/20 transition-all active:scale-95"
                >
                  Viết Nhật Ký
                </button>
              </div>

              {/* Feed timeline stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#faf9f6]/40">
                {loadingDiaries ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#fa7150]" />
                  </div>
                ) : diaries.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-[#e5d8d0] rounded-3xl p-8 max-w-sm mx-auto shadow-sm">
                    <Camera size={36} className="text-[#e5d8d0] mx-auto mb-3" />
                    <p className="text-xs font-black text-[#8a7e75]">Chưa có nhật ký nào cho bé cưng</p>
                    <p className="text-[10px] text-[#8a7e75]/70 mt-1.5 leading-relaxed">Hãy bấm nút "Viết Nhật Ký" ở góc trên bên phải để ghi nhận bữa ăn, hoạt động hôm nay của bé.</p>
                  </div>
                ) : (
                  diaries.map((diary: any) => (
                    <div 
                      key={diary.id}
                      className="bg-white border border-[#e5d8d0] rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow max-w-xl mx-auto"
                    >
                      {/* Author header */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#fa7150] flex items-center justify-center text-white font-black text-sm uppercase">
                            {user?.fullName?.charAt(0) || 'B'}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-[#303330]">{user?.fullName || 'Bảo mẫu chăm sóc'}</h4>
                            <p className="text-[9px] text-[#8a7e75] mt-0.5">{formatDiaryTime(diary.createdAt)}</p>
                          </div>
                        </div>

                        {/* Edit / Delete Options */}
                        <div className="flex gap-3 text-[10px] font-black uppercase">
                          <button
                            onClick={() => handleOpenEditModal(diary)}
                            className="text-[#5a5550] hover:text-[#fa7150] transition-colors cursor-pointer"
                          >
                            Sửa
                          </button>
                          {user?.role === 'PARTNER' && (
                            <button
                              onClick={() => handleDeleteDiary(diary.id)}
                              className="text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Care Parameters pills */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {diary.eating && (
                          <span className="bg-amber-50 border border-amber-200/60 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-black">
                            Ăn uống: {translatePillValue(diary.eating)}
                          </span>
                        )}
                        {diary.mood && (
                          <span className="bg-sky-50 border border-sky-200/60 text-sky-800 text-[10px] px-2.5 py-1 rounded-full font-black">
                            Tâm trạng: {translatePillValue(diary.mood)}
                          </span>
                        )}
                        {diary.activity && (
                          <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full font-black">
                            Hoạt động: {translatePillValue(diary.activity)}
                          </span>
                        )}
                      </div>

                      {/* Content text */}
                      <p className="text-xs text-[#5a5550] leading-relaxed font-semibold">{diary.entryContent}</p>

                      {/* Attached image preview (Multiple images grid) */}
                      {diary.attachedMediaUrls && diary.attachedMediaUrls.length > 0 && (
                        <div className={`grid gap-2 rounded-2xl overflow-hidden border border-[#e5d8d0]/60 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${
                          diary.attachedMediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'
                        }`}>
                          {diary.attachedMediaUrls.map((url: string, idx: number) => (
                            <div key={idx} className="overflow-hidden aspect-video bg-[#faf9f6]">
                              <img 
                                src={url} 
                                alt={`Diary attachment ${idx}`} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions strip */}
                      <div className="flex items-center gap-3 pt-3 border-t border-[#e5d8d0]/60">
                        <button
                          onClick={() => handleToggleLike(diary.id)}
                          className={`px-3.5 py-1.5 rounded-full border text-[10px] font-black transition-all cursor-pointer ${
                            diary.isLikedByMe
                              ? 'bg-rose-50 border-rose-200 text-rose-600'
                              : 'bg-white border-[#e5d8d0] text-[#5a5550] hover:bg-[#faf9f6]'
                          }`}
                        >
                          {diary.isLikedByMe ? 'Đã yêu thích' : 'Yêu thích'} ({diary.likesCount || 0})
                        </button>

                        <div className="px-3.5 py-1.5 rounded-full border border-[#e5d8d0] bg-white text-[#5a5550] text-[10px] font-black">
                          Bình luận ({diary.comments?.length || 0})
                        </div>
                      </div>

                      {/* Comments stream */}
                      <div className="bg-[#faf9f6]/80 rounded-2xl p-4 border border-[#e5d8d0]/60 space-y-3">
                        {diary.comments && diary.comments.length > 0 ? (
                          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                            {diary.comments.map((comment: any) => (
                              <div key={comment.id} className="text-xs leading-relaxed">
                                <div className="flex items-start gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#fa7150]/20 flex items-center justify-center font-black text-[9px] text-[#fa7150] shrink-0 mt-0.5 uppercase">
                                    {comment.authorName?.charAt(0) || 'C'}
                                  </div>
                                  <div className="bg-white border border-[#e5d8d0]/50 rounded-[14px] px-3 py-2 flex-grow shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <span className="font-extrabold text-[#303330] text-[11px]">{comment.authorName}</span>
                                      <span className="text-[8px] text-[#8a7e75]/70">{formatDiaryTime(comment.createdAt)}</span>
                                    </div>
                                    <p className="font-semibold text-[#5a5550] text-[11px]">{comment.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#8a7e75] font-semibold italic text-center py-1">Chưa có bình luận nào.</p>
                        )}

                        {/* New comment input */}
                        <form 
                          onSubmit={(e) => handleAddComment(diary.id, e)} 
                          className="flex gap-2 items-center pt-2 border-t border-[#e5d8d0]/40"
                        >
                          <input
                            type="text"
                            value={commentInputs[diary.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [diary.id]: e.target.value }))}
                            placeholder="Viết bình luận của bạn..."
                            className="flex-grow bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs font-normal outline-none focus:border-[#fa7150] transition-colors placeholder:text-[#8a7e75]/50"
                          />
                          <button
                            type="submit"
                            disabled={!commentInputs[diary.id]?.trim()}
                            className="px-3 py-1.5 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white rounded-xl text-[10px] font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            Gửi
                          </button>
                        </form>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#faf9f6] p-8 text-center">
              <div className="max-w-xs">
                <PawPrint size={48} className="text-[#e5d8d0] mx-auto mb-4" />
                <h3 className="font-black text-[#303330] text-lg">Xem nhật ký chăm sóc</h3>
                <p className="text-xs text-[#8a7e75] mt-1.5 leading-relaxed">
                  Hãy chọn một bé đang lưu trú ở danh sách bên trái để theo dõi lịch trình, bữa ăn và cập nhật nhật ký.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── DIARY UPDATE MODAL (Mạng xã hội Composer) ── */}
      {showDiaryModal && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-[0_24px_60px_rgba(48,51,48,0.25)] border border-[#e5d8d0]/80 animate-in fade-in zoom-in duration-200 text-left">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#e5d8d0]/60">
              <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                <Camera size={18} className="text-[#fa7150]" />
                Tạo khoảnh khắc nhật ký cho bé
              </h3>
              <button 
                onClick={handleCloseDiaryModal}
                className="w-8 h-8 rounded-full bg-[#faf9f6] border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Author / Staff Information */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fa7150] flex items-center justify-center text-white font-black text-sm uppercase">
                {user?.fullName?.charAt(0) || 'B'}
              </div>
              <div>
                <h4 className="font-black text-[#303330] text-sm">{user?.fullName || 'Bảo mẫu chăm sóc'}</h4>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Đang hoạt động</span>
              </div>
            </div>

            <form onSubmit={handleSaveDiary} className="space-y-4 text-xs font-bold">
              {/* Main Content Area (Textarea like status) */}
              <div>
                <textarea
                  rows={4}
                  value={diaryContent}
                  onChange={e => setDiaryContent(e.target.value)}
                  placeholder="Hôm nay bé thế nào? Hãy chia sẻ bữa ăn, giấc ngủ hoặc những trò đùa tinh nghịch của bé cưng tại đây..."
                  className="w-full p-4 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl outline-none font-normal text-sm text-[#303330] focus:border-[#fa7150] transition-colors resize-none placeholder:text-[#8a7e75]/60"
                />
              </div>

              {/* Grid 3 inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Ăn uống</label>
                  <input
                    type="text"
                    value={diaryEating}
                    onChange={e => setDiaryEating(e.target.value)}
                    placeholder="Ví dụ: Hết 1 bát hạt, uống nước..."
                    className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Tâm trạng</label>
                  <input
                    type="text"
                    value={diaryMood}
                    onChange={e => setDiaryMood(e.target.value)}
                    placeholder="Ví dụ: Vui vẻ, nhút nhát..."
                    className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Hoạt động</label>
                  <input
                    type="text"
                    value={diaryActivity}
                    onChange={e => setDiaryActivity(e.target.value)}
                    placeholder="Ví dụ: Đi dạo 15p, chơi bóng..."
                    className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                  />
                </div>
              </div>

              {/* Attached Image Uploader (Real File Upload to Cloudinary - Multiple Images) */}
              <div>
                <label className="block text-[9px] text-[#8a7e75] mb-1.5 uppercase tracking-wider font-extrabold">Hình ảnh hoạt động thực tế (Tải lên nhiều ảnh)</label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {diaryImageUrls.map((url, index) => (
                      <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#e5d8d0] shrink-0 group">
                        <img src={url} alt={`Uploaded preview ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDiaryImageUrls(prev => prev.filter((_, i) => i !== index))}
                          className="absolute inset-0 bg-[#303330]/60 flex items-center justify-center text-white text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ))}

                    <label className="flex flex-col items-center justify-center border border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl w-16 h-16 cursor-pointer bg-white transition-colors shrink-0">
                      <span className="text-[14px] font-bold text-[#5a5550]">+</span>
                      <span className="text-[8px] text-[#8a7e75]">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadLoading(true)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            const res = await axiosInstance.post('/api/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            })
                            setDiaryImageUrls(prev => [...prev, res.data.url])
                          } catch (err) {
                            setPopup({ type: 'error', message: 'Không thể tải tệp lên: Vui lòng kiểm tra kết nối Cloudinary.' })
                          } finally {
                            setUploadLoading(false)
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {uploadLoading && (
                    <div className="text-[10px] text-[#8a7e75] font-bold flex items-center gap-1.5 animate-pulse">
                      Đang xử lý và tải tệp lên Cloudinary...
                    </div>
                  )}
                </div>
              </div>

              {/* Submit actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-[#e5d8d0]/60">
                <button
                  type="button"
                  onClick={handleCloseDiaryModal}
                  className="px-6 py-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-full text-[#5a5550] hover:bg-[#e5d8d0]/40 transition-colors cursor-pointer text-xs font-black"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white rounded-full transition-colors cursor-pointer text-xs font-black shadow-sm shadow-[#fa7150]/20"
                >
                  Đăng nhật ký
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Reusable Premium Dialog Popup */}
      {popup && (
        <div className="fixed inset-0 z-[100] bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_24px_60px_rgba(48,51,48,0.25)] border border-[#e5d8d0]/80 animate-in fade-in zoom-in duration-200 text-center space-y-4">
            
            {/* Status Indicator Icon */}
            {popup.type === 'success' && (
              <div className="w-16 h-16 bg-[#eefae6] text-[#44683b] rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={32} />
              </div>
            )}
            {popup.type === 'error' && (
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={32} />
              </div>
            )}
            {popup.type === 'confirm' && (
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <HelpCircle size={32} />
              </div>
            )}

            <h4 className="text-xs font-black text-[#303330] uppercase tracking-widest">
              {popup.type === 'success' ? 'Thành công' : popup.type === 'error' ? 'Thông báo lỗi' : 'Xác nhận'}
            </h4>
            <p className="text-xs text-[#5a5550] font-semibold leading-relaxed">{popup.message}</p>
            <div className="flex gap-3 justify-center pt-2">
              {popup.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => {
                      popup.onConfirm?.()
                      setPopup(null)
                    }}
                    className="px-6 py-2 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white rounded-full text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all shadow-sm shadow-[#fa7150]/30"
                  >
                    Đồng ý
                  </button>
                  <button
                    onClick={() => setPopup(null)}
                    className="px-6 py-2 bg-[#faf9f6] border border-[#e5d8d0] text-[#5a5550] hover:bg-[#e5d8d0]/40 rounded-full text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPopup(null)}
                  className="px-8 py-2 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white rounded-full text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all shadow-sm shadow-[#fa7150]/30"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
