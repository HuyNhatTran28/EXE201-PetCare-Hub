import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import {
  PawPrint,
  Heart,
  PlusCircle,
  FileText,
  Clock,
  UtensilsCrossed,
  Smile,
  CheckCircle2,
  AlertCircle,
  Plus,
  Compass,
  ChevronRight
} from 'lucide-react'
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
  species?: string
  isVaccinated?: boolean
  vaccineBookUrls?: string[]
  isIndoorOnly?: boolean
  hasSpecialDiet?: boolean
}

export const PetProfilePage = () => {
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'health' | 'habits' | 'bookings'>('health')

  // CRUD States
  const [showModal, setShowModal] = useState(false)
  const [editPet, setEditPet] = useState<PetType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingVaccine, setUploadingVaccine] = useState(false)
  const [form, setForm] = useState({
    name: '',
    species: '',
    breed: '',
    ageYears: '',
    weightKg: '',
    foodType: '',
    specialNotes: '',
    avatarUrl: '',
    isVaccinated: false,
    vaccineBookUrls: [] as string[],
    microchipId: '',
    feedingSchedule: '',
    isIndoorOnly: false,
    hasSpecialDiet: false,
    personalityTags: [] as string[]
  })

  // Popup/Modal States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [alertModal, setAlertModal] = useState<{
    show: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning'
  }>({
    show: false,
    title: '',
    message: '',
    type: 'error'
  })

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setAlertModal({ show: true, title, message, type })
  }

  const mapPets = (list: any[]) => list.map((p: any) => {
    const tags = p.personalityTags || []
    const displayTags = [...tags]
    if (p.isIndoorOnly && !displayTags.includes('Chỉ nuôi trong nhà')) {
      displayTags.push('Chỉ nuôi trong nhà')
    }
    if (p.hasSpecialDiet && !displayTags.includes('Ăn kiêng đặc biệt')) {
      displayTags.push('Ăn kiêng đặc biệt')
    }
    return {
      ...p,
      status: p.status || 'Tại nhà',
      personalityTags: displayTags.length > 0 ? displayTags : ['Thân thiện', 'Năng động'],
      specialNotes: p.specialNotes || 'Chưa có ghi chú nào.',
      feedingSchedule: p.feedingSchedule || 'Hai bữa chính lúc 8:00 và 18:00.',
      foodType: p.foodType || 'Thức ăn hạt tiêu chuẩn.',
      vaccines: p.vaccines || [
        { name: 'Tiêm nhắc lại Dại', doctor: 'BS. Aris Thorne', status: 'COMPLETED', date: '14/08/2025', nextDate: '14/08/2026' },
        { name: 'Bạch cầu mèo (FeLV)', doctor: 'BS. Nguyễn Minh', status: 'WARNING', date: '01/05/2026', nextDate: '15/06/2026' }
      ]
    }
  })

  const fetchPets = async () => {
    try {
      const response = await axiosInstance.get('/api/pets/my')
      const fetchedPets = mapPets(response.data)
      setPets(fetchedPets)
      if (fetchedPets.length > 0 && !selectedPetId) {
        setSelectedPetId(fetchedPets[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch pets', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPets()
  }, [])

  const handleUploadAvatar = async (file: File, isEdit = false) => {
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      if (isEdit && editPet) {
        setEditPet({ ...editPet, avatarUrl: url })
      } else {
        setForm(prev => ({ ...prev, avatarUrl: url }))
      }
    } catch (err) {
      showAlert('Lỗi tải ảnh', 'Tải ảnh đại diện thất bại. Vui lòng thử lại.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleUploadVaccineBook = async (file: File, isEdit = false) => {
    setUploadingVaccine(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      if (isEdit && editPet) {
        const currentUrls = editPet.vaccineBookUrls || []
        setEditPet({ ...editPet, vaccineBookUrls: [...currentUrls, url] })
      } else {
        setForm(prev => ({ ...prev, vaccineBookUrls: [...(prev.vaccineBookUrls || []), url] }))
      }
    } catch (err) {
      showAlert('Lỗi tải ảnh', 'Tải ảnh sổ tiêm phòng thất bại. Vui lòng thử lại.')
    } finally {
      setUploadingVaccine(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập tên thú cưng.', 'warning')
      return
    }
    if (!form.species) {
      showAlert('Thiếu thông tin', 'Vui lòng chọn loài thú cưng (Chó hoặc Mèo).', 'warning')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.post('/api/pets', {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        ageYears: Number(form.ageYears) || 0,
        weightKg: Number(form.weightKg) || 0,
        foodType: form.foodType,
        specialNotes: form.specialNotes,
        avatarUrl: form.avatarUrl,
        isVaccinated: form.isVaccinated,
        vaccineBookUrls: form.vaccineBookUrls,
        microchipId: form.microchipId || null,
        feedingSchedule: form.feedingSchedule || null,
        isIndoorOnly: form.isIndoorOnly,
        hasSpecialDiet: form.hasSpecialDiet,
        personalityTags: form.personalityTags
      })
      const response = await axiosInstance.get('/api/pets/my')
      const fetchedPets = mapPets(response.data)
      setPets(fetchedPets)
      if (fetchedPets.length > 0) {
        setSelectedPetId(fetchedPets[fetchedPets.length - 1].id)
      }
      setShowModal(false)
      setForm({
        name: '',
        species: '',
        breed: '',
        ageYears: '',
        weightKg: '',
        foodType: '',
        specialNotes: '',
        avatarUrl: '',
        isVaccinated: false,
        vaccineBookUrls: [],
        microchipId: '',
        feedingSchedule: '',
        isIndoorOnly: false,
        hasSpecialDiet: false,
        personalityTags: []
      })
      showAlert('Thành công', 'Đã thêm thú cưng mới thành công!', 'success')
    } catch (err: any) {
      console.error('Failed to create pet:', err);
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể tạo thú cưng';
      showAlert('Không thể tạo thú cưng', typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editPet) return
    if (!editPet.name.trim()) {
      showAlert('Thiếu thông tin', 'Vui lòng nhập tên thú cưng.', 'warning')
      return
    }
    if (!editPet.species) {
      showAlert('Thiếu thông tin', 'Vui lòng chọn loài thú cưng (Chó hoặc Mèo).', 'warning')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.put(`/api/pets/${editPet.id}`, {
        name: editPet.name.trim(),
        species: editPet.species || '',
        breed: editPet.breed,
        ageYears: editPet.ageYears,
        weightKg: editPet.weightKg,
        foodType: editPet.foodType,
        specialNotes: editPet.specialNotes,
        avatarUrl: editPet.avatarUrl,
        isVaccinated: editPet.isVaccinated || false,
        vaccineBookUrls: editPet.vaccineBookUrls || [],
        microchipId: editPet.microchipId || null,
        feedingSchedule: editPet.feedingSchedule || null,
        isIndoorOnly: editPet.isIndoorOnly || false,
        hasSpecialDiet: editPet.hasSpecialDiet || false,
        personalityTags: editPet.personalityTags || []
      })
      const response = await axiosInstance.get('/api/pets/my')
      const fetchedPets = mapPets(response.data)
      setPets(fetchedPets)
      setEditPet(null)
      showAlert('Thành công', 'Đã cập nhật hồ sơ thú cưng thành công!', 'success')
    } catch (err: any) {
      console.error('Failed to update pet:', err);
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể cập nhật';
      showAlert('Không thể cập nhật', typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (petId: string) => {
    setDeleteConfirmId(petId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return
    const petId = deleteConfirmId
    setDeleteConfirmId(null)
    try {
      await axiosInstance.delete(`/api/pets/${petId}`)
      const remainingPets = pets.filter(p => p.id !== petId)
      setPets(remainingPets)
      if (selectedPetId === petId) {
        setSelectedPetId(remainingPets.length > 0 ? remainingPets[0].id : '')
      }
      showAlert('Thành công', 'Đã xóa hồ sơ thú cưng thành công!', 'success')
    } catch (err: any) {
      console.error('Failed to delete pet:', err)
      let errMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể xóa thú cưng này';
      if (err.message === 'Network Error' || !err.response) {
        errMsg = 'Lỗi kết nối: Không thể kết nối tới máy chủ. Vui lòng đảm bảo server Backend đã khởi động và hoạt động bình thường.';
      }
      showAlert(
        'Không thể xóa thú cưng',
        typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg,
        'error'
      )
    }
  }

  // Lấy bé đang được chọn
  const activePet = pets.find(p => p.id === selectedPetId)

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }
  const primaryGlow = { background: 'linear-gradient(135deg, #a43e24 0%, #ffac98 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* ── HEADER ── */}
      <Header />

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
            onClick={() => setShowModal(true)}
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
                    <div className={`aspect-square rounded-xl overflow-hidden relative border-4 ${borderAccentColor} bg-[#faf9f6]`}>
                      {pet.avatarUrl ? (
                        <img 
                          alt={pet.name} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                          src={pet.avatarUrl}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-1.5 bg-[#f5f3ef]/60">
                          <PawPrint size={36} className="text-[#a43e24]/40" />
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#e5d8d0]/40 px-2 py-0.5 rounded">
                            {pet.species === 'CAT' ? 'Mèo cưng' : 'Cún cưng'}
                          </span>
                        </div>
                      )}
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

                  {/* Edit/Delete buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-dashed border-[#e5d8d0]" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setEditPet(pet)}
                      className="flex-1 py-1.5 rounded-xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:border-[#a43e24] hover:text-[#a43e24] transition-all"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(pet.id)}
                      className="flex-1 py-1.5 rounded-xl border border-rose-100 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* Empty State / Add Placeholder */}
          <div 
            onClick={() => setShowModal(true)}
            className="bg-[#eeeeea]/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-[#b1b2af] hover:bg-[#eeeeea]/80 transition-colors cursor-pointer group"
          >
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
                  <div className="w-48 h-48 rounded-full mx-auto border-8 border-[#c2ebb2] overflow-hidden mb-6 shadow-inner bg-[#faf9f6] flex items-center justify-center">
                    {activePet.avatarUrl ? (
                      <img 
                        alt={activePet.name} 
                        className="w-full h-full object-cover" 
                        src={activePet.avatarUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-2 bg-[#f5f3ef]/60">
                        <PawPrint size={52} className="text-[#a43e24]/40" />
                        <span className="text-xs font-bold uppercase tracking-widest bg-[#e5d8d0]/50 px-3 py-1 rounded-full">
                          {activePet.species === 'CAT' ? 'Mèo' : 'Chó'}
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-4xl font-black text-[#303330] font-headline">{activePet.name}</h2>
                  <p className="text-[#44683b] font-semibold mt-1">
                    Người bạn đồng hành {activePet.breed} đáng yêu
                  </p>
                  {activePet.microchipId && (
                    <p className="text-[10px] font-bold text-[#8a7e75] uppercase tracking-wider mt-2.5 bg-[#eeeeea] px-3 py-1.5 rounded-full inline-block">
                      Mã Microchip: {activePet.microchipId}
                    </p>
                  )}
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

                  {/* Hồ sơ sổ tiêm thực tế */}
                  {activePet.isVaccinated && activePet.vaccineBookUrls && activePet.vaccineBookUrls.length > 0 && (
                    <div className="mt-8">
                      <h4 className="text-xl font-bold font-headline mb-4">Hình ảnh Sổ tiêm phòng thực tế</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {activePet.vaccineBookUrls.map((url, index) => (
                          <a 
                            key={index} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="aspect-square rounded-xl overflow-hidden border-2 border-[#e5d8d0] hover:border-[#a43e24] transition-all block group relative"
                            style={sunlightShadow}
                          >
                            <img src={url} alt={`Sổ tiêm ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold px-2 py-1 rounded bg-[#a43e24]">Xem ảnh gốc</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
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
                      <p className="whitespace-pre-line">
                        {activePet.specialNotes || `${activePet.name} là một bé cưng vô cùng ngoan ngoãn, thân thiện và rất dễ gần.`}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {activePet.personalityTags?.map((tag, idx) => (
                          <span key={idx} className="bg-[#e1e3df] px-3 py-1 rounded text-xs font-semibold text-[#303330]">
                            {tag}
                          </span>
                        ))}
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



      {/* Footer */}
      <footer className="bg-[#f4f4f0] border-t border-[#b1b2af]/20 py-12 px-8 text-sm text-[#5d605c] mt-24 text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto w-full">
          <div className="space-y-4">
            <div className="text-xl font-bold text-[#303330] font-headline">PetCare Hub</div>
            <p className="text-stone-600">Tạo ra những kỳ nghỉ cá nhân hóa và hạnh phúc nhất cho những người bạn bốn chân của bạn.</p>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold text-[#303330]">Khám phá</h5>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-[#a43e24]">Về chúng tôi</Link></li>
              <li><Link to="/hotels" className="hover:text-[#a43e24]">Các khách sạn</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-bold text-[#303330]">Hỗ trợ</h5>
            <ul className="space-y-2">
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
          © 2026 PetCare Hub. Bảo lưu mọi quyền.
        </div>
      </footer>

      {/* ── MODAL TẠO / EDIT PET ── */}
      {(showModal || editPet) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-left">
            <h3 className="text-xl font-black text-[#303330] mb-6">
              {editPet ? `Chỉnh sửa — ${editPet.name}` : 'Thêm thú cưng mới'}
            </h3>

            <div className="space-y-4">

              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#ffac98] bg-[#faf9f6] flex items-center justify-center">
                  {(editPet ? editPet.avatarUrl : form.avatarUrl) ? (
                    <img
                      src={editPet ? editPet.avatarUrl! : form.avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#f5f3ef] text-[#8a7e75]">
                      <PawPrint size={24} className="text-[#a43e24]/40" />
                    </div>
                  )}
                </div>
                <label className={`flex-1 py-2.5 px-4 border-2 border-dashed rounded-2xl cursor-pointer text-xs font-bold transition-all ${
                  uploadingAvatar ? 'border-[#ffac98] text-[#fa7150]' : 'border-[#e5d8d0] text-[#8a7e75] hover:border-[#a43e24]'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAvatar(file, !!editPet)
                      e.target.value = ''
                    }}
                  />
                  {uploadingAvatar ? 'Đang upload...' : 'Chọn ảnh đại diện'}
                </label>
              </div>

              {/* Tên */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tên thú cưng *</label>
                <input
                  value={editPet ? editPet.name : form.name}
                  onChange={e => editPet
                    ? setEditPet({...editPet, name: e.target.value})
                    : setForm({...form, name: e.target.value})}
                  placeholder="VD: Mimi, Bông, Lucky..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                />
              </div>

              {/* Loài */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Loài *</label>
                <div className="flex gap-2">
                  {['CAT', 'DOG'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => editPet
                        ? setEditPet({...editPet, species: s} as any)
                        : setForm({...form, species: s})}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                        (editPet ? (editPet as any).species : form.species) === s
                          ? 'bg-[#a43e24] text-white border-[#a43e24]'
                          : 'border-[#e5d8d0] text-[#8a7e75] hover:border-[#a43e24]'
                      }`}
                    >
                      {s === 'CAT' ? 'Mèo' : 'Chó'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giống */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giống</label>
                <input
                  value={editPet ? editPet.breed : form.breed}
                  onChange={e => editPet
                    ? setEditPet({...editPet, breed: e.target.value})
                    : setForm({...form, breed: e.target.value})}
                  placeholder="VD: Golden Retriever, Persian..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                />
              </div>

              {/* Mã định danh Microchip */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mã định danh Microchip (nếu có)</label>
                <input
                  value={editPet ? (editPet.microchipId || '') : form.microchipId}
                  onChange={e => editPet
                    ? setEditPet({...editPet, microchipId: e.target.value})
                    : setForm({...form, microchipId: e.target.value})}
                  placeholder="Nhập mã microchip định danh của bé..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                />
              </div>

              {/* Tuổi + Cân nặng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tuổi (năm)</label>
                  <input
                    type="text"
                    value={editPet ? editPet.ageYears : form.ageYears}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      if (editPet) {
                        setEditPet({...editPet, ageYears: Number(val) || 0})
                      } else {
                        setForm({...form, ageYears: val})
                      }
                    }}
                    placeholder="2"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Cân nặng (kg)</label>
                  <input
                    type="text"
                    value={editPet ? editPet.weightKg : form.weightKg}
                    onChange={e => {
                      // Chỉ cho phép nhập số và tối đa 1 dấu chấm thập phân
                      let val = e.target.value.replace(/[^0-9.]/g, '')
                      const parts = val.split('.')
                      if (parts.length > 2) {
                        val = parts[0] + '.' + parts.slice(1).join('')
                      }
                      if (editPet) {
                        setEditPet({...editPet, weightKg: Number(val) || 0})
                      } else {
                        setForm({...form, weightKg: val})
                      }
                    }}
                    placeholder="4.5"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                  />
                </div>
              </div>

              {/* Thức ăn */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Loại thức ăn</label>
                <input
                  value={editPet ? (editPet.foodType || '') : form.foodType}
                  onChange={e => editPet
                    ? setEditPet({...editPet, foodType: e.target.value})
                    : setForm({...form, foodType: e.target.value})}
                  placeholder="VD: Hạt Royal Canin, đồ ăn ướt..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                />
              </div>

              {/* Lịch ăn uống */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Lịch trình & Khẩu phần ăn</label>
                <input
                  value={editPet ? (editPet.feedingSchedule || '') : form.feedingSchedule}
                  onChange={e => editPet
                    ? setEditPet({...editPet, feedingSchedule: e.target.value})
                    : setForm({...form, feedingSchedule: e.target.value})}
                  placeholder="VD: Hai bữa chính lúc 8:00 và 18:00..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24]"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Ghi chú đặc biệt</label>
                <textarea
                  value={editPet ? (editPet.specialNotes || '') : form.specialNotes}
                  onChange={e => editPet
                    ? setEditPet({...editPet, specialNotes: e.target.value})
                    : setForm({...form, specialNotes: e.target.value})}
                  placeholder="Dị ứng, thuốc cần uống, tính cách đặc biệt..."
                  rows={3}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#a43e24] resize-none"
                />
              </div>

              {/* Lựa chọn Cá tính */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Cá tính & Đặc điểm nổi bật</label>
                <div className="flex flex-wrap gap-2 p-3 bg-stone-50 rounded-2xl border border-[#e5d8d0]">
                  {['Thân thiện', 'Năng động', 'Ngoan ngoãn', 'Nhút nhát', 'Dễ gần', 'Thích vuốt ve', 'Tò mò', 'Ham chơi'].map(tag => {
                    const currentTags = editPet ? (editPet.personalityTags || []) : form.personalityTags
                    const isSelected = currentTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          let nextTags: string[]
                          if (isSelected) {
                            nextTags = currentTags.filter(t => t !== tag)
                          } else {
                            nextTags = [...currentTags, tag]
                          }
                          if (editPet) {
                            setEditPet({...editPet, personalityTags: nextTags})
                          } else {
                            setForm({...form, personalityTags: nextTags})
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-[#44683b] text-white border-[#44683b]'
                            : 'bg-white text-[#5d605c] border-[#e5d8d0] hover:border-[#44683b]/60'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tùy chọn Sức khỏe & Sinh hoạt */}
              <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0] space-y-3">
                <label className="text-xs font-bold text-[#8a7e75] uppercase block">Tùy chọn Sức khỏe & Sinh hoạt</label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPet ? (editPet.isIndoorOnly || false) : form.isIndoorOnly}
                    onChange={e => editPet
                      ? setEditPet({...editPet, isIndoorOnly: e.target.checked})
                      : setForm({...form, isIndoorOnly: e.target.checked})}
                    className="rounded text-[#a43e24]"
                  />
                  <span className="text-xs font-bold text-[#303330]">Chỉ nuôi trong nhà (Indoor only)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPet ? (editPet.hasSpecialDiet || false) : form.hasSpecialDiet}
                    onChange={e => editPet
                      ? setEditPet({...editPet, hasSpecialDiet: e.target.checked})
                      : setForm({...form, hasSpecialDiet: e.target.checked})}
                    className="rounded text-[#a43e24]"
                  />
                  <span className="text-xs font-bold text-[#303330]">Có chế độ ăn kiêng / đặc biệt (Special Diet)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPet ? (editPet.isVaccinated || false) : form.isVaccinated}
                    onChange={e => editPet
                      ? setEditPet({...editPet, isVaccinated: e.target.checked} as any)
                      : setForm({...form, isVaccinated: e.target.checked})}
                    className="rounded text-[#a43e24]"
                  />
                  <span className="text-xs font-bold text-[#303330]">Đã tiêm vaccine đầy đủ</span>
                </label>

                {((editPet ? editPet.isVaccinated : form.isVaccinated)) && (
                  <div className="bg-white p-4 rounded-xl border border-[#e5d8d0] space-y-3 mt-2">
                    <label className="text-xs font-bold text-[#8a7e75] uppercase block">Ảnh sổ tiêm phòng / Hồ sơ vaccine</label>
                    
                    {/* Danh sách ảnh sổ vaccine đã upload */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editPet ? editPet.vaccineBookUrls : form.vaccineBookUrls)?.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#e5d8d0]">
                          <img src={url} alt={`vaccine-book-${i}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              if (editPet) {
                                setEditPet({
                                  ...editPet,
                                  vaccineBookUrls: (editPet.vaccineBookUrls || []).filter((_, idx) => idx !== i)
                                })
                              } else {
                                setForm({
                                  ...form,
                                  vaccineBookUrls: form.vaccineBookUrls.filter((_, idx) => idx !== i)
                                })
                              }
                            }}
                            className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className={`w-full py-2.5 px-4 border-2 border-dashed rounded-2xl cursor-pointer text-xs font-bold transition-all block text-center ${
                      uploadingVaccine ? 'border-[#ffac98] text-[#fa7150]' : 'border-[#e5d8d0] text-[#8a7e75] hover:border-[#a43e24]'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingVaccine}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadVaccineBook(file, !!editPet)
                          e.target.value = ''
                        }}
                      />
                      {uploadingVaccine ? 'Đang upload sổ tiêm...' : 'Tải lên ảnh sổ tiêm phòng'}
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowModal(false); setEditPet(null) }}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button
                onClick={editPet ? handleUpdate : handleCreate}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ backgroundColor: submitting ? '#ffac98' : '#a43e24' }}
              >
                {submitting ? 'Đang lưu...' : editPet ? 'Lưu thay đổi' : 'Thêm thú cưng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM ALERT MODAL ── */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center border border-[#eeeeea]">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
              alertModal.type === 'success' ? 'bg-[#ebffdf] text-[#44683b]' :
              alertModal.type === 'warning' ? 'bg-[#fff5f0] text-[#a43e24]' : 'bg-red-50 text-red-500'
            }`}>
              {alertModal.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>
            <h3 className="text-lg font-black text-[#303330] mb-2">{alertModal.title}</h3>
            <p className="text-xs text-[#5d605c] leading-relaxed mb-6 whitespace-pre-line">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
              className="w-full py-3 rounded-full text-white text-xs font-bold transition-all bg-[#a43e24] hover:bg-[#a43e24]/90"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center border border-[#eeeeea]">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-black text-[#303330] mb-2">Xác nhận xóa</h3>
            <p className="text-xs text-[#5d605c] leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa hồ sơ của bé cưng này không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 rounded-full border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:bg-stone-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
