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
  ChevronRight,
  Upload,
  Trash2,
  AlertTriangle,
  Activity,
  BookOpen,
  FileHeart
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
  medicalRecord?: any
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:    { label: 'Chờ thanh toán', bg: 'bg-amber-50 border-amber-200/80',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  CONFIRMED:  { label: 'Đã xác nhận',   bg: 'bg-blue-50 border-blue-200/80',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  CHECKED_IN: { label: 'Đang lưu trú',  bg: 'bg-purple-50 border-purple-200/80',  text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED:  { label: 'Hoàn tất',      bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  CANCELLED:  { label: 'Đã hủy',        bg: 'bg-rose-50 border-rose-200/80',    text: 'text-rose-700',   dot: 'bg-rose-500'   },
}

export const PetProfilePage = () => {
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'health' | 'habits' | 'bookings'>('health')
  const [userBookings, setUserBookings] = useState<any[]>([])

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
    personalityTags: [] as string[],
    gender: '',
    furColor: '',
    parasiteInternal: '',
    parasiteExternal: '',
    allergies: '',
    vaccines: [] as any[]
  })

  // Popup/Modal States
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [medForm, setMedForm] = useState<any>(null)
  const [alertModal, setAlertModal] = useState<{
    show: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning'
    petData?: {
      name: string
      species: string
      breed?: string
      ageYears: number
      weightKg: number
      isVaccinated: boolean
      avatarUrl?: string
    }
  }>({
    show: false,
    title: '',
    message: '',
    type: 'error'
  })

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'error',
    petData?: typeof alertModal.petData
  ) => {
    setAlertModal({ show: true, title, message, type, petData })
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

    let medicalRecord = {
      gender: '',
      dob: '',
      furColor: '',
      ownerName: '',
      ownerPhone: '',
      ownerAddress: '',
      vaccines: [] as any[],
      parasites: { internal: '', external: '' },
      clinicalHistory: [] as any[],
      labResults: { bloodTest: '', imaging: '' },
      surgeries: [] as any[],
      allergies: '',
      specialNotes: p.specialNotes || ''
    }

    if (p.specialNotes && p.specialNotes.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(p.specialNotes)
        medicalRecord = { ...medicalRecord, ...parsed }
      } catch (err) {
        console.error('Failed to parse medical record JSON:', err)
      }
    } else {
      medicalRecord.specialNotes = p.specialNotes || ''
    }

    return {
      ...p,
      status: p.status || 'Tại nhà',
      personalityTags: displayTags,
      medicalRecord,
      specialNotes: medicalRecord.specialNotes || '',
      feedingSchedule: p.feedingSchedule || '',
      foodType: p.foodType || '',
      vaccines: medicalRecord.vaccines && medicalRecord.vaccines.length > 0 ? medicalRecord.vaccines : []
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

  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get('/api/bookings/my', {
        params: { page: 0, size: 50, sort: [] }
      })
      setUserBookings(res.data.content || [])
    } catch (err) {
      console.error('Failed to fetch user bookings:', err)
    }
  }

  useEffect(() => {
    fetchPets()
    fetchBookings()
  }, [])

  useEffect(() => {
    if (showModal || editPet || showMedicalModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal, editPet, showMedicalModal])

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

  const handleUploadMedicalPhoto = async (file: File) => {
    setUploadingVaccine(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      setMedForm((prev: any) => ({
        ...prev,
        vaccineBookUrls: [...(prev.vaccineBookUrls || []), url]
      }))
    } catch (err) {
      showAlert('Lỗi tải ảnh', 'Tải ảnh hồ sơ thất bại. Vui lòng thử lại.')
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
      const medicalRecordObj = {
        gender: form.gender,
        furColor: form.furColor,
        parasites: {
          internal: form.parasiteInternal,
          external: form.parasiteExternal
        },
        allergies: form.allergies,
        vaccines: form.vaccines,
        vaccineBookUrls: form.vaccineBookUrls,
        clinicalHistory: [],
        specialNotes: form.specialNotes
      }

      await axiosInstance.post('/api/pets', {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        ageYears: Number(form.ageYears) || 0,
        weightKg: Number(form.weightKg) || 0,
        foodType: form.foodType,
        specialNotes: JSON.stringify(medicalRecordObj),
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
      const newPetData = {
        name: form.name.trim(),
        species: form.species === 'CAT' ? 'Mèo' : 'Chó',
        breed: form.breed || 'Không rõ',
        ageYears: Number(form.ageYears) || 0,
        weightKg: Number(form.weightKg) || 0,
        isVaccinated: form.isVaccinated,
        avatarUrl: form.avatarUrl
      }
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
        personalityTags: [],
        gender: '',
        furColor: '',
        parasiteInternal: '',
        parasiteExternal: '',
        allergies: '',
        vaccines: []
      })
      showAlert('Thành công', 'Đã thêm thú cưng mới thành công!', 'success', newPetData)
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
      const medicalRecordObj = {
        ...(editPet.medicalRecord || {}),
        specialNotes: editPet.specialNotes,
        vaccineBookUrls: editPet.vaccineBookUrls || []
      }
      const updatedNotesJson = JSON.stringify(medicalRecordObj)

      await axiosInstance.put(`/api/pets/${editPet.id}`, {
        name: editPet.name.trim(),
        species: editPet.species || '',
        breed: editPet.breed,
        ageYears: editPet.ageYears,
        weightKg: editPet.weightKg,
        foodType: editPet.foodType,
        specialNotes: updatedNotesJson,
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
      const updatedPetData = {
        name: editPet.name.trim(),
        species: editPet.species === 'CAT' ? 'Mèo' : 'Chó',
        breed: editPet.breed || 'Không rõ',
        ageYears: Number(editPet.ageYears) || 0,
        weightKg: Number(editPet.weightKg) || 0,
        isVaccinated: editPet.isVaccinated || false,
        avatarUrl: editPet.avatarUrl
      }
      setEditPet(null)
      showAlert('Thành công', 'Đã cập nhật hồ sơ thú cưng thành công!', 'success', updatedPetData)
    } catch (err: any) {
      console.error('Failed to update pet:', err);
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể cập nhật';
      showAlert('Không thể cập nhật', typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateMedicalRecord = async () => {
    if (!activePet || !medForm) return
    setSubmitting(true)
    try {
      const updatedNotesJson = JSON.stringify(medForm)
      await axiosInstance.put(`/api/pets/${activePet.id}`, {
        name: activePet.name,
        species: activePet.species || '',
        breed: activePet.breed,
        ageYears: activePet.ageYears,
        weightKg: activePet.weightKg,
        foodType: activePet.foodType,
        avatarUrl: activePet.avatarUrl,
        isVaccinated: activePet.isVaccinated || (medForm.vaccineBookUrls && medForm.vaccineBookUrls.length > 0) || false,
        vaccineBookUrls: medForm.vaccineBookUrls || [],
        microchipId: activePet.microchipId || null,
        feedingSchedule: activePet.feedingSchedule || null,
        isIndoorOnly: activePet.isIndoorOnly || false,
        hasSpecialDiet: activePet.hasSpecialDiet || false,
        personalityTags: activePet.personalityTags || [],
        specialNotes: updatedNotesJson
      })
      const response = await axiosInstance.get('/api/pets/my')
      const fetchedPets = mapPets(response.data)
      setPets(fetchedPets)
      setShowMedicalModal(false)
      showAlert('Thành công', 'Đã cập nhật hồ sơ y tế thành công!', 'success')
    } catch (err: any) {
      console.error('Failed to update medical record:', err)
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể cập nhật hồ sơ y tế';
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
  const petBookings = activePet ? userBookings.filter(b => b.pets?.some((p: any) => p.id === activePet.id)) : []

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }
  const primaryGlow = { background: 'linear-gradient(135deg, #a43e24 0%, #ffac98 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* ── HEADER ── */}
      <Header />

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        
        {/* Horizontal Pet Selector Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-6 mb-10 border-b border-[#e5d8d0]/50 scrollbar-hide text-left">
          {loading ? (
            <div className="text-xs font-bold text-stone-500 py-2">Đang tải danh sách...</div>
          ) : (
            pets.map((pet) => {
              const isSelected = selectedPetId === pet.id
              return (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#a43e24] text-white border-[#a43e24] shadow-md shadow-[#a43e24]/15'
                      : 'bg-white border-[#e5d8d0] text-[#5d605c] hover:border-[#a43e24]'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200">
                    {pet.avatarUrl ? (
                      <img src={pet.avatarUrl} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-stone-400">{pet.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-black">{pet.name}</span>
                </button>
              )
            })
          )}
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-dashed border-[#b1b2af] text-[#a43e24] bg-white hover:bg-stone-50 transition-all shrink-0 cursor-pointer text-xs font-black"
          >
            Thêm thú cưng mới
          </button>
        </div>

        {/* Detailed View */}
        {activePet ? (
          <div className="space-y-16">
            
            {/* Hero Profile Section */}
            <section className="relative text-left">
              <div className="h-[180px] md:h-[260px] w-full rounded-2xl md:rounded-3xl relative shadow-sm bg-gradient-to-r from-stone-200 to-stone-100 border border-stone-200/40">
                <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f6] via-transparent to-transparent"></div>
              </div>
              
              <div className="mt-[-80px] md:mt-[-110px] px-4 md:px-12 flex flex-col md:flex-row items-end gap-6 relative z-10">
                <div className="relative group shrink-0">
                  <div className="w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden border-[10px] border-[#faf9f6] bg-stone-200 shadow-xl flex items-center justify-center relative" style={{ borderRadius: '60% 40% 70% 30% / 40% 50% 60% 50%' }}>
                    {activePet.avatarUrl ? (
                      <img 
                        alt={activePet.name} 
                        className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-all duration-700" 
                        src={activePet.avatarUrl}
                      />
                    ) : (
                      <span className="text-3xl font-headline font-black text-stone-400">{activePet.name.charAt(0).toUpperCase()}</span>
                    )}
                    
                    {/* Quick upload overlay -> opens edit modal */}
                    <div 
                      onClick={() => setEditPet(activePet)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <span className="text-white text-[11px] font-black flex flex-col items-center gap-1">
                        Thay ảnh
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 pb-4 text-center md:text-left">
                  <h1 className="font-headline text-4xl md:text-6xl font-extrabold text-[#303330] tracking-tight mb-2">{activePet.name}</h1>
                  <div className="flex flex-col md:flex-row items-center gap-3">
                    <p className="font-headline text-[#44683b] font-bold text-base">
                      {activePet.species === 'CAT' ? 'Mèo cưng' : 'Cún cưng'} • Giống {activePet.breed}
                    </p>
                    <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#d0fac0] text-[#2c4e24] text-xs font-black">
                        Cân nặng: {activePet.weightKg}kg
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        activePet.isVaccinated 
                          ? 'bg-[#d0fac0] text-[#2c4e24]'
                          : 'bg-[#ffac98]/40 text-[#a43e24]'
                      }`}>
                        {activePet.isVaccinated ? 'Đã tiêm phòng đầy đủ' : 'Chưa tiêm phòng đầy đủ'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pb-4 w-full md:w-auto">
                  <Link 
                    to="/hotels"
                    style={primaryGlow}
                    className="block w-full md:w-auto text-center text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-[#a43e24]/10 hover:translate-y-[-2px] transition-transform cursor-pointer"
                  >
                    Đặt phòng cho {activePet.name}
                  </Link>
                </div>
              </div>
            </section>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start text-left">
              
              {/* Left Navigation Sidebar */}
              <aside className="lg:col-span-3">
                <nav className="flex flex-row lg:flex-col gap-2.5 sticky top-28 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                  <button 
                    onClick={() => setActiveTab('health')}
                    className={`whitespace-nowrap flex justify-center px-6 py-3.5 rounded-xl transition-all cursor-pointer font-bold text-sm ${
                      activeTab === 'health' 
                        ? 'bg-[#a43e24] text-white shadow-lg shadow-[#a43e24]/15' 
                        : 'bg-white hover:bg-stone-200/40 text-stone-600 border border-[#e5d8d0]'
                    }`}
                  >
                    Sức khỏe
                  </button>
                  <button 
                    onClick={() => setActiveTab('habits')}
                    className={`whitespace-nowrap flex justify-center px-6 py-3.5 rounded-xl transition-all cursor-pointer font-bold text-sm ${
                      activeTab === 'habits' 
                        ? 'bg-[#a43e24] text-white shadow-lg shadow-[#a43e24]/15' 
                        : 'bg-white hover:bg-stone-200/40 text-stone-600 border border-[#e5d8d0]'
                    }`}
                  >
                    Thói quen
                  </button>
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className={`whitespace-nowrap flex justify-center px-6 py-3.5 rounded-xl transition-all cursor-pointer font-bold text-sm ${
                      activeTab === 'bookings' 
                        ? 'bg-[#a43e24] text-white shadow-lg shadow-[#a43e24]/15' 
                        : 'bg-white hover:bg-stone-200/40 text-stone-600 border border-[#e5d8d0]'
                    }`}
                  >
                    Lịch sử lưu trú
                  </button>
                  
                  {/* Quick Edit/Delete buttons on sidebar */}
                  <div className="hidden lg:flex gap-2.5 mt-8 pt-6 border-t border-dashed border-[#e5d8d0] w-full">
                    <button
                      onClick={() => setEditPet(activePet)}
                      className="flex-grow py-3 rounded-xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:border-[#a43e24] hover:text-[#a43e24] transition-all cursor-pointer bg-white"
                    >
                      Sửa hồ sơ
                    </button>
                    <button
                      onClick={() => handleDelete(activePet.id)}
                      className="py-3 px-4 rounded-xl border border-rose-100 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all cursor-pointer bg-white"
                    >
                      Xóa
                    </button>
                  </div>
                </nav>
              </aside>

              {/* Right Content Area */}
              <div className="lg:col-span-9 space-y-12">
                
                {/* 1. HEALTH TAB */}
                {activeTab === 'health' && (
                  <div className="space-y-10 animate-fadeIn">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-[#303330]">Hồ sơ Sức khỏe</h2>
                      <button 
                        onClick={() => {
                          if (activePet) {
                            setMedForm({
                              ...JSON.parse(JSON.stringify(activePet.medicalRecord || {})),
                              vaccineBookUrls: activePet.vaccineBookUrls || []
                            })
                            setShowMedicalModal(true)
                          }
                        }}
                        className="text-[#a43e24] font-bold text-sm hover:underline cursor-pointer"
                      >
                        Cập nhật hồ sơ y tế
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Pet Details Info Card */}
                      <div className="bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm border-t-4 border-[#a43e24] transition-all duration-300">
                        <div className="mb-6 flex justify-between items-center">
                          <h3 className="font-headline font-extrabold text-lg text-[#303330]">Thông tin hành chính</h3>
                        </div>
                        
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">TÊN BÉ</span>
                            <span className="font-black text-[#303330] uppercase">{activePet.name}</span>
                          </div>
                          
                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">LOÀI / GIỐNG</span>
                            <span className="font-black text-[#303330]">
                              {activePet.species === 'CAT' ? 'Mèo' : 'Chó'} ({activePet.breed || 'Chưa rõ'})
                            </span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">GIỚI TÍNH</span>
                            <span className="font-black text-[#303330]">{activePet.medicalRecord?.gender || 'Chưa cập nhật'}</span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">NGÀY SINH / TUỔI</span>
                            <span className="font-black text-[#303330]">
                              {activePet.medicalRecord?.dob ? `${activePet.medicalRecord.dob} (${activePet.ageYears} tuổi)` : `${activePet.ageYears} tuổi`}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">MÀU LÔNG</span>
                            <span className="font-black text-[#303330]">{activePet.medicalRecord?.furColor || 'Chưa cập nhật'}</span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">CÂN NẶNG</span>
                            <span className="font-black text-[#303330]">{activePet.weightKg} kg</span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 text-xs">
                            <span className="text-[#8a7e75] font-bold">MÃ CHIP (MICROCHIP)</span>
                            <span className="font-black text-[#303330] font-mono">{activePet.microchipId || 'Không có'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Vaccination card */}
                      <div className="bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm border-t-4 border-[#44683b] transition-all duration-300">
                        <div className="mb-6">
                          <h3 className="font-headline font-extrabold text-lg text-[#303330]">Lịch tiêm phòng</h3>
                        </div>

                        <div className="space-y-3.5">
                          {activePet.vaccines && activePet.vaccines.length > 0 ? (
                            activePet.vaccines.map((vaccine, idx) => {
                              const isCompleted = vaccine.status === 'COMPLETED'
                              return (
                                <div 
                                  key={idx}
                                  className={`flex justify-between items-center p-4 rounded-xl border ${
                                    isCompleted 
                                      ? 'bg-emerald-50/20 border-emerald-100' 
                                      : 'bg-amber-50/20 border-dashed border-amber-200'
                                  }`}
                                >
                                  <div>
                                    <p className="font-bold text-xs text-[#303330]">{vaccine.name}</p>
                                    <p className={`text-[10px] uppercase font-bold mt-0.5 ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                                      {isCompleted ? `Hạn tiếp theo: ${vaccine.nextDate}` : 'Hết hạn / Cần tiêm lại'}
                                    </p>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    isCompleted 
                                      ? 'bg-[#d0fac0] text-[#2c4e24]' 
                                      : 'bg-[#ffac98] text-[#a43e24]'
                                  }`}>
                                    {isCompleted ? 'Đã tiêm' : 'Chờ tiêm'}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <div className="p-6 rounded-xl border border-dashed border-stone-200 text-center text-stone-500">
                              <p className="text-xs font-bold">Chưa cập nhật thông tin vaccine</p>
                              <p className="text-[10px] text-stone-400 mt-1">Bé cưng cần được cập nhật hồ sơ tiêm chủng đầy đủ trước khi gửi.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parasites & Allergies Card */}
                      <div className="bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm border-t-4 border-[#fa7150] transition-all duration-300">
                        <div className="mb-6">
                          <h3 className="font-headline font-extrabold text-lg text-[#303330]">Ký sinh trùng & Dị ứng</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-amber-50/20 border border-amber-100/50">
                            <p className="font-bold text-amber-800 text-xs mb-1">Nội ký sinh (Tẩy giun)</p>
                            <p className="text-xs text-stone-600 font-semibold">{activePet.medicalRecord?.parasites?.internal || 'Chưa ghi nhận tẩy giun định kỳ'}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-sky-50/20 border border-sky-100/50">
                            <p className="font-bold text-sky-800 text-xs mb-1">Ngoại ký sinh (Ve rận, bọ chét)</p>
                            <p className="text-xs text-stone-600 font-semibold">{activePet.medicalRecord?.parasites?.external || 'Chưa ghi nhận điều trị ngoại ký sinh'}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-rose-50/20 border border-rose-100/50">
                            <p className="font-bold text-[#a43e24] text-xs mb-1">Tiền sử dị ứng</p>
                            <p className="text-xs text-stone-600 font-bold italic">{activePet.medicalRecord?.allergies || 'Không ghi nhận dị ứng'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Labs & Imaging Card */}
                      <div className="bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm border-t-4 border-[#3b5998] transition-all duration-300">
                        <div className="mb-6">
                          <h3 className="font-headline font-extrabold text-lg text-[#303330]">Xét nghiệm & Hình ảnh</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                            <p className="font-bold text-stone-700 text-xs mb-1">Xét nghiệm (Máu, nước tiểu, phân...)</p>
                            <p className="text-xs text-stone-600 font-semibold">{activePet.medicalRecord?.labResults?.bloodTest || 'Chưa có kết quả xét nghiệm'}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                            <p className="font-bold text-stone-700 text-xs mb-1">Chẩn đoán hình ảnh (Siêu âm, X-quang...)</p>
                            <p className="text-xs text-stone-600 font-semibold">{activePet.medicalRecord?.labResults?.imaging || 'Chưa có kết quả siêu âm/X-quang'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Clinical History Card */}
                      <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm border-t-4 border-[#a43e24] transition-all duration-300">
                        <div className="mb-6">
                          <h3 className="font-headline font-extrabold text-lg text-[#303330]">Nhật ký khám bệnh & điều trị</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {activePet.medicalRecord?.clinicalHistory && activePet.medicalRecord.clinicalHistory.length > 0 ? (
                            activePet.medicalRecord.clinicalHistory.map((clin: any, idx: number) => (
                              <div key={idx} className="p-4 bg-stone-50 rounded-xl border border-stone-200/60 text-xs space-y-2 shadow-sm">
                                <div className="flex justify-between items-center border-b border-stone-200 pb-1.5 mb-1.5">
                                  <span className="font-bold text-stone-700">{clin.reason || 'Chưa rõ địa điểm'}</span>
                                  {clin.symptoms && (
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                      clin.symptoms === 'Đang điều trị' 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      {clin.symptoms}
                                    </span>
                                  )}
                                </div>
                                <p className="text-stone-600"><strong className="text-stone-700">Bệnh lý:</strong> {clin.diagnosis || 'Chưa cập nhật'}</p>
                                <p className="text-stone-600"><strong className="text-stone-700">Thuốc & Liều lượng:</strong> {clin.treatment || 'Chưa cập nhật'}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-stone-400 italic md:col-span-2">Chưa ghi nhận bệnh án khám điều trị nào.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sổ tiêm & Sổ sức khỏe thực tế */}
                    {activePet.vaccineBookUrls && activePet.vaccineBookUrls.length > 0 && (
                      <div className="mt-8 text-left">
                        <h4 className="text-lg font-bold font-headline mb-4 text-[#303330]">
                          Ảnh chụp Sổ sức khỏe / Sổ khám & Tiêm phòng thực tế
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {activePet.vaccineBookUrls.map((url, index) => (
                            <a 
                              key={index} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="aspect-square rounded-xl overflow-hidden border border-[#e5d8d0] hover:border-[#a43e24] transition-all block group relative shadow-sm"
                            >
                              <img src={url} alt={`Sổ tiêm ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-white text-[10px] font-bold px-2.5 py-1 rounded bg-[#a43e24] shadow-sm">Xem ảnh gốc ↗</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. HABITS TAB */}
                {activeTab === 'habits' && (
                  <div className="space-y-8 animate-fadeIn">
                    
                    <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-[#303330] mb-6">Thói quen & Cá tính</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Diet Card */}
                      <div className="md:col-span-2 bg-[#feeadb]/30 p-8 rounded-2xl relative overflow-hidden border border-[#feeadb]/60 shadow-sm text-left">
                        <div className="relative z-10 max-w-lg">
                          <h3 className="font-headline font-extrabold text-xl mb-3 text-[#63564b]">Chế độ ăn uống</h3>
                          <div className="space-y-3 text-[#63564b]/90 text-sm leading-relaxed font-medium">
                            <p className="font-bold">{activePet.name} thích khẩu vị dinh dưỡng như thế nào?</p>
                            <ul className="space-y-2 mt-2">
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#a43e24]"></span>
                                <span><strong>Loại thức ăn:</strong> {activePet.foodType || 'Chưa ghi nhận loại thức ăn.'}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#a43e24]"></span>
                                <span><strong>Lịch trình & Khẩu phần:</strong> {activePet.feedingSchedule || 'Chưa ghi nhận lịch ăn.'}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Personality Card */}
                      <div className="bg-white p-8 rounded-2xl border border-[#e5d8d0] shadow-sm flex flex-col items-center text-center justify-center transition-all duration-300">
                        <h3 className="font-headline font-extrabold text-base mb-3 text-[#303330]">Cá tính</h3>
                        {activePet.personalityTags && activePet.personalityTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {activePet.personalityTags.map((tag, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-[#44683b]/10 text-[#2c4e24] text-xs font-bold rounded-lg border border-[#44683b]/20">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 leading-relaxed">
                            {activePet.name} ngoan ngoãn, đáng yêu và rất thân thiện.
                          </p>
                        )}
                      </div>

                      {/* Quote Card */}
                      <div className="md:col-span-3 relative rounded-2xl overflow-hidden h-48 shadow-md bg-gradient-to-r from-stone-800 to-stone-700 flex flex-col justify-center items-center p-8 text-center">
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative z-10 w-full max-w-xl">
                          <p className="text-white text-xs font-bold uppercase tracking-wider opacity-75 mb-2.5">
                            Ghi chú & Chỉ dẫn đặc biệt
                          </p>
                          <p className="text-lg md:text-xl text-white font-headline font-bold italic leading-relaxed">
                            {activePet.specialNotes && activePet.specialNotes.trim() && activePet.specialNotes.toLowerCase() !== 'khoong' && activePet.specialNotes.toLowerCase() !== 'không' ? (
                              `"${activePet.specialNotes}"`
                            ) : (
                              `"${activePet.name} là một người bạn nhỏ tuyệt vời, rất thích được vui chơi và cưng chiều."`
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BOOKINGS TAB */}
                {activeTab === 'bookings' && (
                  <div className="space-y-6 animate-fadeIn">
                    <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-[#303330] mb-6">Lịch sử lưu trú</h2>
                    
                    {petBookings.length > 0 ? (
                      <div className="bg-white rounded-2xl overflow-hidden border border-[#e5d8d0] shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-stone-50/80 text-left border-b border-[#e5d8d0]">
                                <th className="px-6 py-4 font-headline font-bold text-xs uppercase tracking-wider text-stone-500">Phòng lưu trú</th>
                                <th className="px-6 py-4 font-headline font-bold text-xs uppercase tracking-wider text-stone-500">Thời gian</th>
                                <th className="px-6 py-4 font-headline font-bold text-xs uppercase tracking-wider text-stone-500 text-right">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5d8d0]/50">
                              {petBookings.map((booking) => {
                                const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CANCELLED
                                return (
                                  <tr key={booking.id} className="hover:bg-stone-50/30 transition-colors">
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center border border-stone-200 text-stone-400 font-bold text-[10px] uppercase tracking-wider shrink-0">
                                          Room
                                        </div>
                                        <div>
                                          <span className="font-headline font-extrabold text-[#303330] block text-sm">{booking.roomTypeName}</span>
                                          <span className="text-[11px] text-stone-500">{booking.hotelName}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[#303330]">{booking.checkInDate} - {booking.checkOutDate}</span>
                                        <span className="text-[10px] text-stone-500 mt-0.5">
                                          {booking.bookingType === 'DAYCARE' ? `${booking.totalDays || 1} ngày gửi` : `${booking.totalNights || 1} đêm lưu trú`}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text}`}>
                                        {cfg.label}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-12 rounded-2xl border border-dashed border-stone-200 text-center text-stone-500 shadow-inner">
                        <p className="text-sm font-bold">Chưa có lịch sử lưu trú</p>
                        <p className="text-xs text-stone-400 mt-1.5">Bé cưng của bạn chưa thực hiện kỳ nghỉ nào cùng PetCare Hub.</p>
                        <Link
                          to="/hotels"
                          style={primaryGlow}
                          className="mt-6 inline-block text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Khám phá khách sạn ngay
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-white max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-[#303330]">Chưa có thông tin thú cưng</h3>
            <p className="text-xs text-stone-500 mt-2">Bắt đầu bằng việc tạo hồ sơ cho người bạn nhỏ để nhận các dịch vụ chăm sóc tốt nhất.</p>
            <button
              onClick={() => setShowModal(true)}
              style={primaryGlow}
              className="mt-6 px-6 py-2.5 rounded-full text-xs font-bold text-white uppercase tracking-wider cursor-pointer"
            >
              Thêm thú cưng mới
            </button>
          </div>
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

              {/* Section 1: Thông tin cơ bản */}
              <div className="bg-[#faf9f6] p-5 rounded-3xl border-2 border-[#e5d8d0] space-y-4 shadow-sm">
                <h4 className="text-[13px] font-black text-[#a43e24] uppercase tracking-wider border-b border-[#e5d8d0] pb-2 border-l-3 border-[#a43e24] pl-2.5 mb-2">
                  1. Thông tin cơ bản
                </h4>

                {/* Tên */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">
                    Tên thú cưng <span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    value={editPet ? editPet.name : form.name}
                    onChange={e => editPet
                      ? setEditPet({...editPet, name: e.target.value})
                      : setForm({...form, name: e.target.value})}
                    placeholder="VD: Mimi, Bông, Lucky..."
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                  />
                </div>

                {/* Loài */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">
                    Loài <span className="text-red-600 font-bold">*</span>
                  </label>
                  <div className="flex gap-2">
                    {['CAT', 'DOG'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => editPet
                          ? setEditPet({...editPet, species: s} as any)
                          : setForm({...form, species: s})}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                          (editPet ? (editPet as any).species : form.species) === s
                            ? 'bg-[#a43e24] text-white border-[#a43e24] shadow-md shadow-[#a43e24]/10'
                            : 'border-[#e5d8d0] bg-white text-[#5a5550] hover:border-[#a43e24] hover:text-[#a43e24]'
                        }`}
                      >
                        {s === 'CAT' ? 'Mèo' : 'Chó'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Giống */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Giống (Breed)</label>
                  <input
                    value={editPet ? editPet.breed : form.breed}
                    onChange={e => editPet
                      ? setEditPet({...editPet, breed: e.target.value})
                      : setForm({...form, breed: e.target.value})}
                    placeholder="VD: Golden Retriever, Persian..."
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                  />
                </div>

                {/* Mã định danh Microchip */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Mã định danh Microchip (nếu có)</label>
                  <input
                    value={editPet ? (editPet.microchipId || '') : form.microchipId}
                    onChange={e => editPet
                      ? setEditPet({...editPet, microchipId: e.target.value})
                      : setForm({...form, microchipId: e.target.value})}
                    placeholder="Nhập mã microchip định danh của bé..."
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                  />
                </div>

                {/* Tuổi + Cân nặng */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Tuổi (năm)</label>
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
                      className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Cân nặng (kg)</label>
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
                      className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Chế độ ăn uống & Ghi chú */}
              <div className="bg-[#faf9f6] p-5 rounded-3xl border-2 border-[#e5d8d0] space-y-4 shadow-sm">
                <h4 className="text-[13px] font-black text-[#a43e24] uppercase tracking-wider border-b border-[#e5d8d0] pb-2 border-l-3 border-[#a43e24] pl-2.5 mb-2">
                  2. Chế độ ăn uống & Ghi chú
                </h4>

                {/* Thức ăn */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Loại thức ăn</label>
                  <input
                    value={editPet ? (editPet.foodType || '') : form.foodType}
                    onChange={e => editPet
                      ? setEditPet({...editPet, foodType: e.target.value})
                      : setForm({...form, foodType: e.target.value})}
                    placeholder="VD: Hạt Royal Canin, đồ ăn ướt..."
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                  />
                </div>

                {/* Lịch ăn uống */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Lịch trình & Khẩu phần ăn</label>
                  <input
                    value={editPet ? (editPet.feedingSchedule || '') : form.feedingSchedule}
                    onChange={e => editPet
                      ? setEditPet({...editPet, feedingSchedule: e.target.value})
                      : setForm({...form, feedingSchedule: e.target.value})}
                    placeholder="VD: Hai bữa chính lúc 8:00 và 18:00..."
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm"
                  />
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-1.5 block tracking-wide">Ghi chú đặc biệt</label>
                  <textarea
                    value={editPet ? (editPet.specialNotes || '') : form.specialNotes}
                    onChange={e => editPet
                      ? setEditPet({...editPet, specialNotes: e.target.value})
                      : setForm({...form, specialNotes: e.target.value})}
                    placeholder="Dị ứng, thuốc cần uống, tính cách đặc biệt..."
                    rows={3}
                    className="w-full border-2 border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm bg-white outline-none focus:border-[#a43e24] focus:ring-4 focus:ring-[#a43e24]/10 transition-all shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Section 3: Cá tính & Sức khỏe */}
              <div className="bg-[#faf9f6] p-5 rounded-3xl border-2 border-[#e5d8d0] space-y-5 shadow-sm">
                <h4 className="text-[13px] font-black text-[#a43e24] uppercase tracking-wider border-b border-[#e5d8d0] pb-2 border-l-3 border-[#a43e24] pl-2.5">
                  3. Cá tính & Sức khỏe
                </h4>

                {/* Lựa chọn Cá tính */}
                <div>
                  <label className="text-xs font-black text-[#4a433d] uppercase mb-2 block tracking-wide">Cá tính & Đặc điểm nổi bật</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white rounded-2xl border-2 border-[#e5d8d0] shadow-inner">
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
                          className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border-2 ${
                            isSelected
                              ? 'bg-[#44683b] text-white border-[#44683b] shadow-md shadow-[#44683b]/10'
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
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-black text-[#4a433d] uppercase block tracking-wide">Tùy chọn Sinh hoạt & Phòng bệnh</label>
                  
                  <div className="space-y-2.5 bg-white p-4 rounded-2xl border-2 border-[#e5d8d0]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPet ? (editPet.isIndoorOnly || false) : form.isIndoorOnly}
                        onChange={e => editPet
                          ? setEditPet({...editPet, isIndoorOnly: e.target.checked})
                          : setForm({...form, isIndoorOnly: e.target.checked})}
                        className="rounded text-[#a43e24] focus:ring-[#a43e24] h-4.5 w-4.5"
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
                        className="rounded text-[#a43e24] focus:ring-[#a43e24] h-4.5 w-4.5"
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
                        className="rounded text-[#a43e24] focus:ring-[#a43e24] h-4.5 w-4.5"
                      />
                      <span className="text-xs font-bold text-[#303330]">Đã tiêm vaccine đầy đủ</span>
                    </label>
                  </div>

                  {((editPet ? editPet.isVaccinated : form.isVaccinated)) && (
                    <div className="bg-white p-4 rounded-xl border-2 border-[#e5d8d0] space-y-3 mt-2">
                      <label className="text-xs font-black text-[#4a433d] uppercase block tracking-wide">Ảnh sổ tiêm phòng / Hồ sơ vaccine</label>
                      
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

              {/* Chi tiết sổ sức khỏe */}
              <div className="bg-[#feeadb]/20 p-5 rounded-2xl border border-[#feeadb] space-y-4 text-left">
                <h4 className="text-[13px] font-black text-[#a43e24] uppercase tracking-wider border-b border-[#feeadb] pb-2 border-l-3 border-[#a43e24] pl-2.5">
                  Sổ sức khỏe & tiêm phòng chi tiết
                </h4>

                {/* Giới tính & Màu lông */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Giới tính</label>
                    <select
                      value={editPet ? (editPet.medicalRecord?.gender || '') : form.gender}
                      onChange={e => {
                        if (editPet) {
                          const med = editPet.medicalRecord || {}
                          setEditPet({
                            ...editPet,
                            medicalRecord: { ...med, gender: e.target.value }
                          })
                        } else {
                          setForm({ ...form, gender: e.target.value })
                        }
                      }}
                      className="w-full bg-white border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    >
                      <option value="">Chưa chọn</option>
                      <option value="Đực">Đực</option>
                      <option value="Cái">Cái</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Màu lông</label>
                    <input
                      value={editPet ? (editPet.medicalRecord?.furColor || '') : form.furColor}
                      onChange={e => {
                        if (editPet) {
                          const med = editPet.medicalRecord || {}
                          setEditPet({
                            ...editPet,
                            medicalRecord: { ...med, furColor: e.target.value }
                          })
                        } else {
                          setForm({ ...form, furColor: e.target.value })
                        }
                      }}
                      placeholder="VD: Trắng, vàng, đen..."
                      className="w-full bg-white border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>

                {/* Phòng ký sinh trùng */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Nội ký sinh (Tẩy giun định kỳ)</label>
                    <input
                      value={editPet ? (editPet.medicalRecord?.parasites?.internal || '') : form.parasiteInternal}
                      onChange={e => {
                        if (editPet) {
                          const med = editPet.medicalRecord || {}
                          const par = med.parasites || {}
                          setEditPet({
                            ...editPet,
                            medicalRecord: { ...med, parasites: { ...par, internal: e.target.value } }
                          })
                        } else {
                          setForm({ ...form, parasiteInternal: e.target.value })
                        }
                      }}
                      placeholder="VD: Sanpet (uống ngày...)"
                      className="w-full bg-white border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Ngoại ký sinh (Ve rận, bọ chét)</label>
                    <input
                      value={editPet ? (editPet.medicalRecord?.parasites?.external || '') : form.parasiteExternal}
                      onChange={e => {
                        if (editPet) {
                          const med = editPet.medicalRecord || {}
                          const par = med.parasites || {}
                          setEditPet({
                            ...editPet,
                            medicalRecord: { ...med, parasites: { ...par, external: e.target.value } }
                          })
                        } else {
                          setForm({ ...form, parasiteExternal: e.target.value })
                        }
                      }}
                      placeholder="VD: Frontline (nhỏ gáy...)"
                      className="w-full bg-white border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>

                {/* Dị ứng */}
                <div>
                  <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Tiền sử dị ứng</label>
                  <input
                    value={editPet ? (editPet.medicalRecord?.allergies || '') : form.allergies}
                    onChange={e => {
                      if (editPet) {
                        const med = editPet.medicalRecord || {}
                        setEditPet({
                          ...editPet,
                          medicalRecord: { ...med, allergies: e.target.value }
                        })
                      } else {
                        setForm({ ...form, allergies: e.target.value })
                      }
                    }}
                    placeholder="VD: Dị ứng thịt gà, phấn hoa..."
                    className="w-full bg-white border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                  />
                </div>

                {/* Lịch sử tiêm phòng */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-t border-dashed border-[#feeadb] pt-3">
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block">Danh sách mũi tiêm vắc-xin</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (editPet) {
                          const med = editPet.medicalRecord || {}
                          const vaccines = med.vaccines || []
                          setEditPet({
                            ...editPet,
                            medicalRecord: {
                              ...med,
                              vaccines: [...vaccines, { name: '', date: '', nextDate: '', doctor: '', status: 'COMPLETED' }]
                            }
                          })
                        } else {
                          setForm({
                            ...form,
                            vaccines: [...form.vaccines, { name: '', date: '', nextDate: '', doctor: '', status: 'COMPLETED' }]
                          })
                        }
                      }}
                      className="text-[10px] font-black text-[#a43e24] hover:underline"
                    >
                      + Thêm mũi tiêm
                    </button>
                  </div>

                  <div className="space-y-3">
                    {((editPet ? (editPet.medicalRecord?.vaccines || []) : form.vaccines) || []).map((vax: any, i: number) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-[#e5d8d0] relative space-y-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (editPet) {
                              const med = editPet.medicalRecord || {}
                              const vaccines = med.vaccines || []
                              setEditPet({
                                ...editPet,
                                medicalRecord: {
                                  ...med,
                                  vaccines: vaccines.filter((_, idx) => idx !== i)
                                }
                              })
                            } else {
                              setForm({
                                ...form,
                                vaccines: form.vaccines.filter((_, idx) => idx !== i)
                              })
                            }
                          }}
                          className="absolute top-2 right-2 text-stone-400 hover:text-red-500 font-bold text-[10px]"
                        >
                          Xóa
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <div>
                            <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Tên vắc-xin</label>
                            <input
                              value={vax.name || ''}
                              onChange={e => {
                                if (editPet) {
                                  const med = editPet.medicalRecord || {}
                                  const vaccines = [...(med.vaccines || [])]
                                  vaccines[i] = { ...vaccines[i], name: e.target.value }
                                  setEditPet({
                                    ...editPet,
                                    medicalRecord: { ...med, vaccines }
                                  })
                                } else {
                                  const vaccines = [...form.vaccines]
                                  vaccines[i] = { ...vaccines[i], name: e.target.value }
                                  setForm({ ...form, vaccines })
                                }
                              }}
                              placeholder="VD: Dại, 4 bệnh..."
                              className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#a43e24]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Bác sĩ thú y</label>
                            <input
                              value={vax.doctor || ''}
                              onChange={e => {
                                if (editPet) {
                                  const med = editPet.medicalRecord || {}
                                  const vaccines = [...(med.vaccines || [])]
                                  vaccines[i] = { ...vaccines[i], doctor: e.target.value }
                                  setEditPet({
                                    ...editPet,
                                    medicalRecord: { ...med, doctor: e.target.value }
                                  })
                                } else {
                                  const vaccines = [...form.vaccines]
                                  vaccines[i] = { ...vaccines[i], doctor: e.target.value }
                                  setForm({ ...form, vaccines })
                                }
                              }}
                              placeholder="Tên bác sĩ..."
                              className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#a43e24]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Ngày tiêm</label>
                            <input
                              type="date"
                              value={vax.date || ''}
                              onChange={e => {
                                if (editPet) {
                                  const med = editPet.medicalRecord || {}
                                  const vaccines = [...(med.vaccines || [])]
                                  vaccines[i] = { ...vaccines[i], date: e.target.value }
                                  setEditPet({
                                    ...editPet,
                                    medicalRecord: { ...med, vaccines }
                                  })
                                } else {
                                  const vaccines = [...form.vaccines]
                                  vaccines[i] = { ...vaccines[i], date: e.target.value }
                                  setForm({ ...form, vaccines })
                                }
                              }}
                              className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#a43e24]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Ngày nhắc lại</label>
                            <input
                              type="date"
                              value={vax.nextDate || ''}
                              onChange={e => {
                                if (editPet) {
                                  const med = editPet.medicalRecord || {}
                                  const vaccines = [...(med.vaccines || [])]
                                  vaccines[i] = { ...vaccines[i], nextDate: e.target.value }
                                  setEditPet({
                                    ...editPet,
                                    medicalRecord: { ...med, vaccines }
                                  })
                                } else {
                                  const vaccines = [...form.vaccines]
                                  vaccines[i] = { ...vaccines[i], nextDate: e.target.value }
                                  setForm({ ...form, vaccines })
                                }
                              }}
                              className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-lg px-2 py-1 text-[11px] outline-none focus:border-[#a43e24]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {((editPet ? (editPet.medicalRecord?.vaccines || []) : form.vaccines) || []).length === 0 && (
                      <p className="text-[10px] text-stone-400 italic">Chưa thêm mũi tiêm nào.</p>
                    )}
                  </div>
                </div>
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
            <p className="text-xs text-[#5d605c] leading-relaxed whitespace-pre-line">{alertModal.message}</p>

            {alertModal.petData && (
              <div className="mt-4 mb-6 p-4 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-left space-y-2.5">
                <div className="flex items-center gap-3 border-b border-[#e1e3df] pb-2.5">
                  {alertModal.petData.avatarUrl ? (
                    <img 
                      src={alertModal.petData.avatarUrl} 
                      alt="Pet avatar" 
                      className="w-10 h-10 rounded-full object-cover border border-[#e5d8d0] shadow-sm" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#a43e24]/10 text-[#a43e24] flex items-center justify-center font-black text-sm">
                      {alertModal.petData.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-[#303330]">{alertModal.petData.name}</h4>
                    <span className="text-[10px] text-[#8a7e75] font-bold uppercase">
                      {alertModal.petData.species} • {alertModal.petData.breed}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#8a7e75] block text-[9px] font-bold uppercase">Tuổi</span>
                    <strong className="text-[#303330]">{alertModal.petData.ageYears} tuổi</strong>
                  </div>
                  <div>
                    <span className="text-[#8a7e75] block text-[9px] font-bold uppercase">Cân nặng</span>
                    <strong className="text-[#303330]">{alertModal.petData.weightKg} kg</strong>
                  </div>
                </div>

                <div className="border-t border-[#e1e3df] pt-2 flex items-center justify-between text-xs">
                  <span className="text-[#8a7e75]">Trạng thái tiêm phòng:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    alertModal.petData.isVaccinated 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {alertModal.petData.isVaccinated ? 'Đã tiêm chủng' : 'Chưa tiêm chủng'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setAlertModal(prev => ({ ...prev, show: false, petData: undefined }))}
              className={`w-full py-3 rounded-full text-white text-xs font-bold transition-all bg-[#a43e24] hover:bg-[#a43e24]/90 ${
                alertModal.petData ? 'mt-0' : 'mt-6'
              }`}
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

      {/* ── MEDICAL RECORD MODAL ── */}
      {showMedicalModal && medForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-left space-y-6">
            <div className="border-b border-[#e5d8d0] pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#303330]">Cập nhật hồ sơ y tế</h3>
                <p className="text-xs text-[#8a7e75] mt-1">Cập nhật hồ sơ sức khỏe và lịch sử điều trị chi tiết của bé cưng.</p>
              </div>
              <button
                onClick={() => { setShowMedicalModal(false); setMedForm(null); }}
                className="text-stone-400 hover:text-stone-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Section 1: Basic Admin Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider border-b border-stone-100 pb-1">1. Thông tin hành chính</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Giới tính</label>
                    <select
                      value={medForm.gender || ''}
                      onChange={e => setMedForm({ ...medForm, gender: e.target.value })}
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    >
                      <option value="">Chưa chọn</option>
                      <option value="Đực">Đực</option>
                      <option value="Cái">Cái</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Màu lông</label>
                    <input
                      value={medForm.furColor || ''}
                      onChange={e => setMedForm({ ...medForm, furColor: e.target.value })}
                      placeholder="VD: Vàng kem, đen trắng..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Vaccination record */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                  <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider">2. Lịch sử tiêm phòng</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const currentVax = medForm.vaccines || []
                      setMedForm({
                        ...medForm,
                        vaccines: [...currentVax, { name: '', date: '', nextDate: '', doctor: '', status: 'COMPLETED' }]
                      })
                    }}
                    className="text-[10px] font-black text-[#a43e24] hover:underline"
                  >
                    + Thêm mũi tiêm
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(medForm.vaccines || []).map((vax: any, i: number) => (
                    <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-[#e5d8d0] relative space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMedForm({
                            ...medForm,
                            vaccines: medForm.vaccines.filter((_: any, idx: number) => idx !== i)
                          })
                        }}
                        className="absolute top-2 right-3 text-stone-400 hover:text-red-500 font-bold text-xs"
                      >
                        Xóa
                      </button>
                      <div className="grid grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Tên vắc-xin</label>
                          <input
                            value={vax.name || ''}
                            onChange={e => {
                              const newVax = [...medForm.vaccines]
                              newVax[i].name = e.target.value
                              setMedForm({ ...medForm, vaccines: newVax })
                            }}
                            placeholder="VD: Dại, 4 bệnh..."
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Bác sĩ thú y</label>
                          <input
                            value={vax.doctor || ''}
                            onChange={e => {
                              const newVax = [...medForm.vaccines]
                              newVax[i].doctor = e.target.value
                              setMedForm({ ...medForm, vaccines: newVax })
                            }}
                            placeholder="Tên bác sĩ..."
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Ngày tiêm</label>
                          <input
                            type="date"
                            value={vax.date || ''}
                            onChange={e => {
                              const newVax = [...medForm.vaccines]
                              newVax[i].date = e.target.value
                              setMedForm({ ...medForm, vaccines: newVax })
                            }}
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Ngày nhắc lại</label>
                          <input
                            type="date"
                            value={vax.nextDate || ''}
                            onChange={e => {
                              const newVax = [...medForm.vaccines]
                              newVax[i].nextDate = e.target.value
                              setMedForm({ ...medForm, vaccines: newVax })
                            }}
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(medForm.vaccines || []).length === 0 && (
                    <p className="text-[10px] text-stone-400 italic">Chưa ghi nhận lịch sử tiêm phòng.</p>
                  )}
                </div>
              </div>

              {/* Section 3: Parasite treatment records */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider border-b border-stone-100 pb-1">3. Phòng ký sinh trùng</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Nội ký sinh (Tẩy giun định kỳ)</label>
                    <input
                      value={medForm.parasites?.internal || ''}
                      onChange={e => setMedForm({
                        ...medForm,
                        parasites: { ...(medForm.parasites || {}), internal: e.target.value }
                      })}
                      placeholder="VD: Sanpet (uống 15/06/2026)..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Ngoại ký sinh (Nhỏ gáy/Trị ve rận)</label>
                    <input
                      value={medForm.parasites?.external || ''}
                      onChange={e => setMedForm({
                        ...medForm,
                        parasites: { ...(medForm.parasites || {}), external: e.target.value }
                      })}
                      placeholder="VD: Frontline (nhỏ gáy 15/06/2026)..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Clinical History */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-stone-100 pb-1">
                  <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider">4. Nhật ký khám bệnh & điều trị</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const currentClin = medForm.clinicalHistory || []
                      setMedForm({
                        ...medForm,
                        clinicalHistory: [...currentClin, { reason: '', symptoms: '', diagnosis: '', treatment: '' }]
                      })
                    }}
                    className="text-[10px] font-black text-[#a43e24] hover:underline"
                  >
                    + Thêm lượt khám
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(medForm.clinicalHistory || []).map((clin: any, i: number) => (
                    <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-[#e5d8d0] relative space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMedForm({
                            ...medForm,
                            clinicalHistory: medForm.clinicalHistory.filter((_: any, idx: number) => idx !== i)
                          })
                        }}
                        className="absolute top-2 right-3 text-stone-400 hover:text-red-500 font-bold text-xs"
                      >
                        Xóa
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Địa điểm khám / Phòng khám</label>
                          <input
                            value={clin.reason || ''}
                            onChange={e => {
                              const newClin = [...medForm.clinicalHistory]
                              newClin[i].reason = e.target.value
                              setMedForm({ ...medForm, clinicalHistory: newClin })
                            }}
                            placeholder="VD: BV thú y ABC, Phòng khám XYZ..."
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Trạng thái điều trị</label>
                          <select
                            value={clin.symptoms || ''}
                            onChange={e => {
                              const newClin = [...medForm.clinicalHistory]
                              newClin[i].symptoms = e.target.value
                              setMedForm({ ...medForm, clinicalHistory: newClin })
                            }}
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          >
                            <option value="">Chưa chọn</option>
                            <option value="Đang điều trị">Đang điều trị</option>
                            <option value="Đã khỏi bệnh">Đã khỏi bệnh</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Tên bệnh / Chẩn đoán</label>
                          <input
                            value={clin.diagnosis || ''}
                            onChange={e => {
                              const newClin = [...medForm.clinicalHistory]
                              newClin[i].diagnosis = e.target.value
                              setMedForm({ ...medForm, clinicalHistory: newClin })
                            }}
                            placeholder="Mắc bệnh gì..."
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-[#8a7e75] uppercase block">Thuốc điều trị & Liều lượng</label>
                          <input
                            value={clin.treatment || ''}
                            onChange={e => {
                              const newClin = [...medForm.clinicalHistory]
                              newClin[i].treatment = e.target.value
                              setMedForm({ ...medForm, clinicalHistory: newClin })
                            }}
                            placeholder="Thuốc sử dụng, liều lượng..."
                            className="w-full bg-white border border-[#e5d8d0] rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#a43e24]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(medForm.clinicalHistory || []).length === 0 && (
                    <p className="text-[10px] text-stone-400 italic">Chưa ghi nhận nhật ký khám điều trị.</p>
                  )}
                </div>
              </div>

              {/* Section 5: Lab Results & Imaging */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider border-b border-stone-100 pb-1">5. Kết quả xét nghiệm & Chẩn đoán hình ảnh</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Xét nghiệm (Máu, nước tiểu, phân, test nhanh...)</label>
                    <input
                      value={medForm.labResults?.bloodTest || ''}
                      onChange={e => setMedForm({
                        ...medForm,
                        labResults: { ...(medForm.labResults || {}), bloodTest: e.target.value }
                      })}
                      placeholder="VD: Test nhanh Parvo âm tính..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Chẩn đoán hình ảnh (Siêu âm, X-quang, MRI...)</label>
                    <input
                      value={medForm.labResults?.imaging || ''}
                      onChange={e => setMedForm({
                        ...medForm,
                        labResults: { ...(medForm.labResults || {}), imaging: e.target.value }
                      })}
                      placeholder="VD: Siêu âm ổ bụng bình thường..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Allergies & Medical Alerts */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider border-b border-stone-100 pb-1">6. Tiền sử dị ứng & Ghi chú</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Tiền sử dị ứng (Thuốc/Thức ăn)</label>
                    <input
                      value={medForm.allergies || ''}
                      onChange={e => setMedForm({ ...medForm, allergies: e.target.value })}
                      placeholder="VD: Dị ứng Penicillin, dị ứng thịt bò..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#8a7e75] uppercase block mb-1">Ghi chú chỉ dẫn đặc biệt</label>
                    <input
                      value={medForm.specialNotes || ''}
                      onChange={e => setMedForm({ ...medForm, specialNotes: e.target.value })}
                      placeholder="VD: Nhút nhát khi gặp người lạ..."
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 7: Health Profile Photos */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#a43e24] uppercase tracking-wider border-b border-stone-100 pb-1">7. Ảnh chụp sổ khám bệnh / Sổ tiêm phòng / Hồ sơ sức khỏe</h4>
                <div className="bg-stone-50 p-4 rounded-2xl border border-[#e5d8d0] space-y-3">
                  <label className="text-[10px] font-bold text-[#8a7e75] uppercase block">Danh sách ảnh đã tải lên</label>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {(medForm.vaccineBookUrls || []).map((url: string, i: number) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e5d8d0] shadow-sm bg-white">
                        <img src={url} alt={`medical-doc-${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setMedForm({
                              ...medForm,
                              vaccineBookUrls: medForm.vaccineBookUrls.filter((_: any, idx: number) => idx !== i)
                            })
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {(medForm.vaccineBookUrls || []).length === 0 && (
                      <p className="text-[10px] text-stone-400 italic">Chưa có ảnh hồ sơ nào được tải lên.</p>
                    )}
                  </div>

                  <label className={`w-full py-3 px-4 border-2 border-dashed rounded-2xl cursor-pointer text-xs font-bold transition-all block text-center bg-white ${
                    uploadingVaccine ? 'border-[#ffac98] text-[#fa7150]' : 'border-[#e5d8d0] text-[#8a7e75] hover:border-[#a43e24]'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingVaccine}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadMedicalPhoto(file)
                        e.target.value = ''
                      }}
                    />
                    {uploadingVaccine ? 'Đang tải ảnh lên...' : 'Tải lên ảnh sổ sức khỏe / sổ tiêm'}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-[#e5d8d0]">
              <button
                type="button"
                onClick={() => { setShowMedicalModal(false); setMedForm(null); }}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpdateMedicalRecord}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-xs font-bold bg-[#a43e24] hover:bg-[#a43e24]/90 disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu hồ sơ y tế'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
