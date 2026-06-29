import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  PlusCircle,
  Video,
  DollarSign,
  Maximize2,
  Edit3,
  Building,
  Eye,
  EyeOff,
  MapPin,
  Upload,
  Trash2
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { cleanAddressDisplay } from '@/utils/cleanAddress'
const formatNumberWithDots = (val: string | number | undefined | null) => {
  if (val === undefined || val === null || val === '') return ''
  const numStr = String(val).replace(/[^0-9]/g, '')
  if (!numStr) return ''
  return Number(numStr).toLocaleString('vi-VN')
}

interface RoomType {
  id: string
  name: string
  pricePerNight: number
  dayRate?: number | null
  maxPets: number
  totalRooms: number
  allowedPetTypes: string[]
  hasWebcam: boolean
  description: string
  images: string[]
  isActive: boolean
}

const RoomImageSlideshow = ({ images, name }: { images: string[]; name: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [images])

  if (!images || images.length === 0) return null

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl mb-4 group">
      <img
        src={images[currentIndex]}
        alt={`${name}-${currentIndex}`}
        className="w-full h-full object-cover transition-all duration-700 ease-in-out transform scale-100 group-hover:scale-105"
      />
      {images.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}

export const RoomManagePage = () => {
  const { user } = useAuthStore()
  const { hotelId } = useParams<{ hotelId: string }>()
  const [rooms, setRooms] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)

  // Hotel details states
  const [hotel, setHotel] = useState<any | null>(null)
  const [originalHotelExtra, setOriginalHotelExtra] = useState<any>(null)
  const [showEditHotelModal, setShowEditHotelModal] = useState(false)
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    checkInTime: '08:00',
    checkOutTime: '20:00',
    googleMapsUrl: '',
    locationLat: 10.7769,
    locationLong: 106.7009,
    amenities: [] as string[],
    logoUrl: '',
    frontUrl: '',
    roomsUrl: '',
    imageUrls: [] as string[],
    descriptionText: ''
  })
  const [uploadingHotelField, setUploadingHotelField] = useState<string | null>(null)
  const [savingHotel, setSavingHotel] = useState(false)

  const handleHotelImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHotelField(fieldKey)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      if (fieldKey === 'logo') {
        setHotelForm(prev => ({ ...prev, logoUrl: url }))
      } else if (fieldKey === 'front') {
        setHotelForm(prev => ({ ...prev, frontUrl: url }))
      } else if (fieldKey === 'rooms') {
        setHotelForm(prev => ({ ...prev, roomsUrl: url }))
      } else if (fieldKey === 'album') {
        setHotelForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, url] }))
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('Tải ảnh lên thất bại')
    } finally {
      setUploadingHotelField(null)
      e.target.value = ''
    }
  }

  const handleStartEditHotel = () => {
    if (!hotel) return
    setHotelForm({
      name: hotel.name || '',
      address: hotel.address || '',
      checkInTime: hotel.checkInTime || '08:00',
      checkOutTime: hotel.checkOutTime || '20:00',
      googleMapsUrl: hotel.googleMapsUrl || '',
      locationLat: hotel.locationLat || 10.7769,
      locationLong: hotel.locationLong || 106.7009,
      amenities: hotel.amenities || [],
      logoUrl: originalHotelExtra?.logoUrl || '',
      frontUrl: originalHotelExtra?.frontUrl || '',
      roomsUrl: originalHotelExtra?.roomsUrl || '',
      imageUrls: originalHotelExtra?.imageUrls || [],
      descriptionText: originalHotelExtra?.description || ''
    })
    setShowEditHotelModal(true)
  }

  const handleSaveHotelDetails = async () => {
    if (!hotelForm.name.trim() || !hotelForm.address.trim()) {
      alert('Tên cơ sở và địa chỉ không được để trống!')
      return
    }
    setSavingHotel(true)
    try {
      const updatedExtra = {
        ...originalHotelExtra,
        logoUrl: hotelForm.logoUrl,
        frontUrl: hotelForm.frontUrl,
        roomsUrl: hotelForm.roomsUrl,
        imageUrls: hotelForm.imageUrls,
        description: hotelForm.descriptionText
      }

      const payload = {
        name: hotelForm.name,
        address: hotelForm.address,
        locationLat: hotelForm.locationLat,
        locationLong: hotelForm.locationLong,
        googleMapsUrl: hotelForm.googleMapsUrl,
        description: JSON.stringify(updatedExtra),
        amenities: hotelForm.amenities,
        checkInTime: hotelForm.checkInTime,
        checkOutTime: hotelForm.checkOutTime
      }

      const res = await axiosInstance.put(`/api/hotels/${hotelId}`, payload)
      if (res.data) {
        setHotel(res.data)
        setOriginalHotelExtra(updatedExtra)
        setShowEditHotelModal(false)
        alert('Cập nhật thông tin cơ sở thành công!')
      }
    } catch (err: any) {
      console.error('Failed to update hotel basic details', err)
      alert(err.response?.data?.message || 'Không thể lưu thông tin cơ sở. Vui lòng kiểm tra lại.')
    } finally {
      setSavingHotel(false)
    }
  }

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editRoom, setEditRoom] = useState<RoomType | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      if (editRoom) {
        setEditRoom(prev => prev ? {
          ...prev,
          images: [...(prev.images || []), url]
        } : null)
      } else {
        setForm(prev => ({
          ...prev,
          images: [...(prev.images || []), url]
        }))
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('Upload ảnh thất bại')
    } finally {
      setUploadingImage(false)
    }
  }
  const [form, setForm] = useState({
    name: '',
    description: '',
    pricePerNight: '',
    dayRate: '',
    maxPets: '',
    totalRooms: '',
    allowedPetTypes: [] as string[],
    images: [] as string[],
  })

  const handleToggleRoomActive = async (roomId: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'tạm ngưng hoạt động' : 'kích hoạt lại'
    if (!confirm(`Bạn có chắc muốn ${actionText} loại phòng này?`)) return
    try {
      await axiosInstance.patch(`/api/room-types/${roomId}/toggle`)
      const res = await axiosInstance.get(`/api/room-types/hotel/${hotelId}?activeOnly=false`)
      setRooms(res.data || [])
    } catch (err: any) {
      console.error('Failed to toggle room active status', err)
      alert(err.response?.data?.message || 'Không thể thay đổi trạng thái')
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Bạn có chắc muốn xóa loại phòng này? LƯU Ý: Thao tác này sẽ ẩn và ngưng hoạt động loại phòng này.')) return
    try {
      await axiosInstance.delete(`/api/room-types/${roomId}`)
      const res = await axiosInstance.get(`/api/room-types/hotel/${hotelId}?activeOnly=false`)
      setRooms(res.data || [])
    } catch (err: any) {
      console.error('Failed to delete room', err)
      alert(err.response?.data?.message || 'Không thể xóa loại phòng')
    }
  }

  const handleUpdateRoom = async () => {
    if (!editRoom) return
    if (Number(editRoom.pricePerNight) <= 0) {
      alert('Giá thuê phải lớn hơn 0!')
      return
    }
    if (editRoom.dayRate !== undefined && editRoom.dayRate !== null && String(editRoom.dayRate) !== '' && Number(editRoom.dayRate) <= 0) {
      alert('Giá gửi ngày phải lớn hơn 0!')
      return
    }
    if (Number(editRoom.totalRooms) <= 0) {
      alert('Tổng số phòng phải lớn hơn 0!')
      return
    }
    if (Number(editRoom.maxPets) <= 0) {
      alert('Số lượng tối đa thú cưng phải lớn hơn 0!')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.put(`/api/room-types/${editRoom.id}`, {
        name: editRoom.name,
        description: editRoom.description,
        pricePerNight: Number(editRoom.pricePerNight),
        dayRate: (editRoom.dayRate !== undefined && editRoom.dayRate !== null && String(editRoom.dayRate) !== '') ? Number(editRoom.dayRate) : null,
        maxPets: Number(editRoom.maxPets),
        totalRooms: Number(editRoom.totalRooms),
        allowedPetTypes: editRoom.allowedPetTypes || [],
        images: editRoom.images || []
      })
      const res = await axiosInstance.get(`/api/room-types/hotel/${hotelId}?activeOnly=false`)
      setRooms(res.data || [])
      setEditRoom(null)
    } catch (err: any) {
      console.error('Failed to update:', err.response?.data || err.message)
      alert(err.response?.data?.message || 'Không thể cập nhật loại phòng')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!form.name || !form.pricePerNight || !form.totalRooms) return
    if (Number(form.pricePerNight) <= 0) {
      alert('Giá thuê phải lớn hơn 0!')
      return
    }
    if (form.dayRate && Number(form.dayRate) <= 0) {
      alert('Giá gửi ngày phải lớn hơn 0!')
      return
    }
    if (Number(form.totalRooms) <= 0) {
      alert('Tổng số phòng phải lớn hơn 0!')
      return
    }
    if (form.maxPets && Number(form.maxPets) <= 0) {
      alert('Số lượng tối đa thú cưng phải lớn hơn 0!')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.post(`/api/room-types/${hotelId}`, {
        name: form.name,
        description: form.description,
        pricePerNight: Number(form.pricePerNight),
        dayRate: form.dayRate ? Number(form.dayRate) : null,
        maxPets: Number(form.maxPets) || 2,
        totalRooms: Number(form.totalRooms),
        allowedPetTypes: form.allowedPetTypes,
        images: form.images || []
      })
      // Reload rooms
      const res = await axiosInstance.get(`/api/room-types/hotel/${hotelId}?activeOnly=false`)
      setRooms(res.data || [])
      setShowModal(false)
      setForm({ name: '', description: '', pricePerNight: '', dayRate: '', maxPets: '', totalRooms: '', allowedPetTypes: [], images: [] })
    } catch (err) {
      console.error('Failed to create room type', err)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchRoomsAndHotel = async () => {
      try {
        const response = await axiosInstance.get(`/api/room-types/hotel/${hotelId}?activeOnly=false`)
        setRooms(response.data || [])

        const hotelRes = await axiosInstance.get(`/api/hotels/${hotelId}`)
        if (hotelRes.data) {
          setHotel(hotelRes.data)
          const desc = hotelRes.data.description
          let parsedExtra = {
            logoUrl: '',
            frontUrl: '',
            roomsUrl: '',
            imageUrls: [],
            description: '',
            cccd: {},
            legal: {},
            banking: {}
          }
          if (desc && desc.trim().startsWith('{')) {
            try {
              parsedExtra = JSON.parse(desc)
            } catch (e) {
              console.error('Failed to parse hotel description JSON:', e)
            }
          } else {
            parsedExtra.description = desc || ''
          }
          setOriginalHotelExtra(parsedExtra)
        }
      } catch (error) {
        console.error('Failed to load room types or hotel details', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoomsAndHotel()
  }, [hotelId])

  useEffect(() => {
    if (showEditHotelModal || showModal || editRoom) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showEditHotelModal, showModal, editRoom])

  // Design Tokens
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }

  return (
    <div className="flex-grow flex flex-col min-w-0">

      {/* ── TOP UTILITIES BAR ── */}
      <header className="h-20 bg-white border-b border-[#e5d8d0] px-8 flex items-center justify-between shrink-0">
        {/* Header Back & Page Title */}
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="w-10 h-10 rounded-full border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-lg font-black tracking-tight text-[#303330]">Cài Đặt Cấu Hình Loại Phòng</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#8a7e75]">{user?.fullName || 'Đối tác'}</span>
          <div className="w-9 h-9 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center font-black text-xs text-[#fa7150]">
            {user?.fullName?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="p-8 md:p-12 overflow-y-auto flex-grow max-w-7xl w-full mx-auto">

        {/* Hotel Details Summary Card */}
        {hotel && (
          <div className="bg-white border border-[#e5d8d0] rounded-[32px] p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm text-left" style={cardShadow}>
            <div className="flex items-center gap-5 text-left flex-col sm:flex-row">
              {originalHotelExtra?.logoUrl ? (
                <img src={originalHotelExtra.logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border border-[#e5d8d0] shadow-sm shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center font-black text-2xl text-[#fa7150] shrink-0">
                  {hotel.name?.charAt(0)}
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-[#303330]">{hotel.name}</h1>
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${hotel.status === 'ACTIVE' ? 'bg-[#e3f4e1] text-[#2c4e24] border-[#d0fac0]' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {hotel.status === 'ACTIVE' ? 'Đang hoạt động' : 'Chờ duyệt'}
                  </span>
                </div>
                <p className="text-xs text-[#8a7e75] leading-relaxed">
                  Địa chỉ: {cleanAddressDisplay(hotel.address)}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#5a5550]">
                  <span>Giờ mở cửa: <strong className="text-[#303330]">{hotel.checkInTime || '08:00'} - {hotel.checkOutTime || '20:00'}</strong></span>
                  {hotel.googleMapsUrl && (
                    <a href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[#fa7150] hover:underline">
                      Bản đồ Google Maps
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hotel.amenities?.map((am: string, idx: number) => {
                    const dict: Record<string, string> = {
                      'Pet Boarding': 'Lưu trú thú cưng',
                      'Other Services': 'Dịch vụ khác',
                      'Private Garden': 'Sân vườn riêng',
                      'Điều hòa (AC)': 'Điều hòa (AC)',
                      'Camera 24/7': 'Camera 24/7'
                    }
                    const displayName = dict[am] || am
                    return (
                      <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {displayName}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={handleStartEditHotel}
              className="bg-white border border-[#e5d8d0] px-5 py-3 rounded-full font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all cursor-pointer w-full md:w-auto text-center"
            >
              Chỉnh sửa thông tin cơ sở
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black text-[#303330]">Danh Sách Hạng Phòng</h2>
            <p className="text-xs text-[#8a7e75]">Cấu hình giá tiền, sức chứa và kiểm soát camera giám sát 24/7 phục vụ khách hàng.</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-[#fa7150] text-white px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer w-fit text-center"
          >
            <PlusCircle size={16} /> Thêm loại phòng mới
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-[#8a7e75] font-bold text-sm flex flex-col items-center gap-3 bg-white border border-[#e5d8d0] rounded-3xl">
            <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin"></span>
            Đang tải danh sách hạng phòng...
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-20 text-center border border-[#e5d8d0] bg-white rounded-[32px] p-8">
            <p className="text-[#8a7e75] font-black text-sm mb-4">Chưa có hạng phòng nào được thiết lập cho cơ sở này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`bg-white border border-[#e5d8d0] rounded-[32px] p-8 relative overflow-hidden transition-all duration-300 hover:border-[#fa7150]/30 hover:shadow-xl hover:shadow-[#fa7150]/2 ${room.isActive === false ? 'opacity-80 border-dashed bg-[#faf9f6]/40' : ''
                  }`}
                style={cardShadow}
              >
                {/* Ảnh phòng & Slideshow */}
                <RoomImageSlideshow images={room.images} name={room.name} />

                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-[#303330] hover:text-[#fa7150] transition-colors">{room.name}</h3>
                    <div>
                      {room.isActive !== false ? (
                        <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          Tạm ngưng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditRoom(room)}
                      className="p-2.5 rounded-2xl bg-[#faf9f6] border border-[#e5d8d0]/60 text-[#8a7e75] hover:text-[#fa7150] transition-all cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleRoomActive(room.id, room.isActive !== false)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${room.isActive !== false
                        ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      title={room.isActive !== false ? "Tạm ngưng hoạt động" : "Kích hoạt lại"}
                    >
                      {room.isActive !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-2.5 rounded-2xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all cursor-pointer"
                      title="Xóa loại phòng"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#5a5550] leading-relaxed mb-6 h-10 line-clamp-2">{room.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1 flex items-center gap-1"><DollarSign size={12} /> Giá Qua Đêm</span>
                      <span className="text-lg font-black text-[#303330]">{room.pricePerNight.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {room.dayRate !== undefined && room.dayRate !== null && (
                      <div className="border-t border-[#e5d8d0]/40 mt-2 pt-2">
                        <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1">Giá Gửi Ngày</span>
                        <span className="text-sm font-black text-[#303330]">{room.dayRate.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1 flex items-center gap-1"><Maximize2 size={12} /> Sức Chứa Tối Đa</span>
                      <span className="text-lg font-black text-[#303330]">{room.maxPets} thú cưng</span>
                    </div>
                    <div className="border-t border-[#e5d8d0]/40 mt-2 pt-2">
                      <span className="block text-[10px] font-black text-[#a43e24] uppercase mb-1">Tổng Số Phòng</span>
                      <span className="text-sm font-black text-[#303330]">{room.totalRooms} phòng</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e5d8d0]/60 pt-4 text-xs font-bold">
                  <div className="flex gap-1.5">
                    {room.allowedPetTypes.map((type, idx) => {
                      const cleanType = type.toUpperCase()
                      let label = type
                      if (cleanType === 'CAT') label = 'Mèo'
                      else if (cleanType === 'DOG') label = 'Chó'
                      else if (cleanType === 'RABBIT') label = 'Thỏ'
                      return (
                        <span key={idx} className="bg-[#f5ede8] px-3.5 py-1.5 rounded-xl text-[#8a7e75] text-[10px] font-black uppercase tracking-wider">
                          {label}
                        </span>
                      )
                    })}
                  </div>

                  {room.hasWebcam && (
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Video size={12} /> Có Webcam 24/7
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── MODAL TẠO PHÒNG ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl text-left max-h-[90vh] overflow-y-auto my-8">
            <h3 className="text-xl font-black text-[#303330] mb-6">Thêm loại phòng mới</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tên loại phòng *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Deluxe Ocean View, Suite Cát Vàng, Standard Cozy..."
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Không gian rộng rãi 15m2, trang bị nệm ngủ êm ái, thích hợp cho các bé năng động thích chạy nhảy..."
                  rows={3}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giá/đêm (đ) *</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(form.pricePerNight)}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, pricePerNight: val })
                    }}
                    placeholder="350.000"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giá gửi ngày (đ)</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(form.dayRate)}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, dayRate: val })
                    }}
                    placeholder="Để trống nếu không nhận gửi ngày"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tổng phòng *</label>
                  <input
                    type="text"
                    value={form.totalRooms}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, totalRooms: val })
                    }}
                    placeholder="5"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Max thú cưng / phòng</label>
                  <input
                    type="text"
                    value={form.maxPets}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, maxPets: val })
                    }}
                    placeholder="2"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Loại thú cưng nhận</label>
                <div className="flex gap-2">
                  {['DOG', 'CAT'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = form.allowedPetTypes
                        setForm({
                          ...form,
                          allowedPetTypes: current.includes(type)
                            ? current.filter(t => t !== type)
                            : [...current, type]
                        })
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${form.allowedPetTypes.includes(type)
                        ? 'bg-[#fa7150] text-white border-[#fa7150]'
                        : 'border-[#e5d8d0] text-[#8a7e75]'
                        }`}
                    >
                      {type === 'DOG' ? 'Chó' : 'Mèo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload ảnh */}
              <div className="mt-4">
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">
                  Ảnh phòng
                </label>

                {/* Preview ảnh hiện có */}
                {form.images && form.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`room-${idx}`}
                          className="w-20 h-20 object-cover rounded-xl border border-[#e5d8d0]"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx)
                          }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input upload */}
                <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingImage
                  ? 'border-[#ffac98] bg-[#fff7f4]'
                  : 'border-[#e5d8d0] hover:border-[#fa7150] hover:bg-[#fff7f4]'
                  }`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadImage(file)
                      e.target.value = ''
                    }}
                  />
                  {uploadingImage ? (
                    <span className="text-xs text-[#fa7150] font-bold">Đang upload...</span>
                  ) : (
                    <span className="text-xs text-[#8a7e75] font-bold">
                      + Thêm ảnh phòng
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ backgroundColor: submitting ? '#ffac98' : '#fa7150' }}
              >
                {submitting ? 'Đang tạo...' : 'Tạo loại phòng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SỬA PHÒNG ── */}
      {editRoom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl text-left max-h-[90vh] overflow-y-auto my-8">
            <h3 className="text-xl font-black text-[#303330] mb-6">Chỉnh sửa loại phòng</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tên loại phòng</label>
                <input
                  value={editRoom.name}
                  onChange={e => setEditRoom({ ...editRoom, name: e.target.value })}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mô tả</label>
                <textarea
                  value={editRoom.description || ''}
                  onChange={e => setEditRoom({ ...editRoom, description: e.target.value })}
                  rows={3}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giá/đêm</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(editRoom.pricePerNight)}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditRoom({ ...editRoom, pricePerNight: Number(val) })
                    }}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giá gửi ngày (đ)</label>
                  <input
                    type="text"
                    value={formatNumberWithDots(editRoom.dayRate)}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditRoom({ ...editRoom, dayRate: val ? Number(val) : null })
                    }}
                    placeholder="Không nhận gửi ngày"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tổng phòng</label>
                  <input
                    type="text"
                    value={editRoom.totalRooms === 0 ? '' : editRoom.totalRooms}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditRoom({ ...editRoom, totalRooms: Number(val) })
                    }}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Max thú cưng / phòng</label>
                  <input
                    type="text"
                    value={editRoom.maxPets === 0 ? '' : editRoom.maxPets}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditRoom({ ...editRoom, maxPets: Number(val) })
                    }}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Loại thú cưng nhận</label>
                <div className="flex gap-2">
                  {['DOG', 'CAT'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = editRoom.allowedPetTypes || []
                        setEditRoom({
                          ...editRoom,
                          allowedPetTypes: current.includes(type)
                            ? current.filter(t => t !== type)
                            : [...current, type]
                        })
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${editRoom.allowedPetTypes?.includes(type)
                        ? 'bg-[#fa7150] text-white border-[#fa7150]'
                        : 'border-[#e5d8d0] text-[#8a7e75]'
                        }`}
                    >
                      {type === 'DOG' ? 'Chó' : 'Mèo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload ảnh */}
              <div className="mt-4">
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">
                  Ảnh phòng
                </label>

                {/* Preview ảnh hiện có */}
                {editRoom?.images && editRoom.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {editRoom.images.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`room-${idx}`}
                          className="w-20 h-20 object-cover rounded-xl border border-[#e5d8d0]"
                        />
                        <button
                          type="button"
                          onClick={() => setEditRoom(prev => prev ? {
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx)
                          } : null)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input upload */}
                <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploadingImage
                  ? 'border-[#ffac98] bg-[#fff7f4]'
                  : 'border-[#e5d8d0] hover:border-[#fa7150] hover:bg-[#fff7f4]'
                  }`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadImage(file)
                      e.target.value = ''
                    }}
                  />
                  {uploadingImage ? (
                    <span className="text-xs text-[#fa7150] font-bold">Đang upload...</span>
                  ) : (
                    <span className="text-xs text-[#8a7e75] font-bold">
                      + Thêm ảnh phòng
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditRoom(null)}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateRoom}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ backgroundColor: submitting ? '#ffac98' : '#fa7150' }}
              >
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SỬA THÔNG TIN CƠ SỞ ── */}
      {showEditHotelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl text-left max-h-[90vh] overflow-y-auto my-8">
            <h3 className="text-xl font-black text-[#303330] mb-6">Chỉnh sửa thông tin cơ sở</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tên cơ sở / Cửa hàng *</label>
                <input
                  value={hotelForm.name}
                  onChange={e => setHotelForm({ ...hotelForm, name: e.target.value })}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Địa chỉ cơ sở *</label>
                <input
                  value={hotelForm.address}
                  onChange={e => setHotelForm({ ...hotelForm, address: e.target.value })}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giờ mở cửa *</label>
                  <input
                    type="time"
                    value={hotelForm.checkInTime}
                    onChange={e => setHotelForm({ ...hotelForm, checkInTime: e.target.value })}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giờ đóng cửa *</label>
                  <input
                    type="time"
                    value={hotelForm.checkOutTime}
                    onChange={e => setHotelForm({ ...hotelForm, checkOutTime: e.target.value })}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Link Google Maps</label>
                  <input
                    type="url"
                    value={hotelForm.googleMapsUrl}
                    onChange={e => setHotelForm({ ...hotelForm, googleMapsUrl: e.target.value })}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Vĩ độ (Lat)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={hotelForm.locationLat}
                    onChange={e => setHotelForm({ ...hotelForm, locationLat: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Kinh độ (Lng)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={hotelForm.locationLong}
                    onChange={e => setHotelForm({ ...hotelForm, locationLong: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mô tả giới thiệu</label>
                <textarea
                  value={hotelForm.descriptionText}
                  onChange={e => setHotelForm({ ...hotelForm, descriptionText: e.target.value })}
                  rows={3}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150] resize-none"
                />
              </div>

              {/* Dịch vụ & Tiện nghi checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#fa7150] uppercase mb-2 block">Dịch vụ cung cấp</label>
                  <div className="space-y-2 bg-[#faf9f6] p-3 rounded-2xl border border-[#e5d8d0]/60">
                    {[
                      { id: 'Pet Boarding', label: 'Khách sạn lưu trú' },
                      { id: 'Grooming & Spa', label: 'Tắm & Grooming' },
                      { id: 'Veterinary', label: 'Thú y & Bệnh viện' },
                      { id: 'Pet Shop', label: 'Pet Shop / Phụ kiện' },
                      { id: 'Other Services', label: 'Dịch vụ khác' }
                    ].map(srv => {
                      const isChecked = hotelForm.amenities.includes(srv.id)
                      return (
                        <label key={srv.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setHotelForm(prev => ({
                                ...prev,
                                amenities: isChecked
                                  ? prev.amenities.filter(a => a !== srv.id)
                                  : [...prev.amenities, srv.id]
                              }))
                            }}
                            className="rounded text-[#fa7150] focus:ring-[#fa7150]"
                          />
                          <span>{srv.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#fa7150] uppercase mb-2 block">Tiện nghi bổ sung</label>
                  <div className="space-y-2 bg-[#faf9f6] p-3 rounded-2xl border border-[#e5d8d0]/60">
                    {[
                      { id: 'Private Garden', label: 'Sân vườn riêng' },
                      { id: 'Điều hòa (AC)', label: 'Điều hòa nhiệt độ' },
                      { id: 'Camera 24/7', label: 'Camera giám sát 24/7' }
                    ].map(am => {
                      const isChecked = hotelForm.amenities.includes(am.id)
                      return (
                        <label key={am.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setHotelForm(prev => ({
                                ...prev,
                                amenities: isChecked
                                  ? prev.amenities.filter(a => a !== am.id)
                                  : [...prev.amenities, am.id]
                              }))
                            }}
                            className="rounded text-[#fa7150] focus:ring-[#fa7150]"
                          />
                          <span>{am.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Tải hình ảnh cơ sở */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Hình ảnh cơ sở</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Logo */}
                  <div className="text-center">
                    <span className="block text-[10px] text-[#8a7e75] mb-1">LOGO</span>
                    <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] rounded-xl p-3 flex flex-col items-center justify-center min-h-[80px] relative overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!!uploadingHotelField}
                        onChange={e => handleHotelImageUpload(e, 'logo')}
                      />
                      {uploadingHotelField === 'logo' ? (
                        <span className="text-[10px] text-[#fa7150] font-bold">Đang tải...</span>
                      ) : hotelForm.logoUrl ? (
                        <img src={hotelForm.logoUrl} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <>
                          <Upload size={16} className="text-[#fa7150] mb-1" />
                          <span className="text-[8px] uppercase">Tải lên</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Mặt tiền */}
                  <div className="text-center">
                    <span className="block text-[10px] text-[#8a7e75] mb-1">MẶT TIỀN</span>
                    <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] rounded-xl p-3 flex flex-col items-center justify-center min-h-[80px] relative overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!!uploadingHotelField}
                        onChange={e => handleHotelImageUpload(e, 'front')}
                      />
                      {uploadingHotelField === 'front' ? (
                        <span className="text-[10px] text-[#fa7150] font-bold">Đang tải...</span>
                      ) : hotelForm.frontUrl ? (
                        <img src={hotelForm.frontUrl} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <>
                          <Upload size={16} className="text-[#fa7150] mb-1" />
                          <span className="text-[8px] uppercase">Tải lên</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Cơ sở vật chất */}
                  <div className="text-center">
                    <span className="block text-[10px] text-[#8a7e75] mb-1">PHÒNG ỐC</span>
                    <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] rounded-xl p-3 flex flex-col items-center justify-center min-h-[80px] relative overflow-hidden">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!!uploadingHotelField}
                        onChange={e => handleHotelImageUpload(e, 'rooms')}
                      />
                      {uploadingHotelField === 'rooms' ? (
                        <span className="text-[10px] text-[#fa7150] font-bold">Đang tải...</span>
                      ) : hotelForm.roomsUrl ? (
                        <img src={hotelForm.roomsUrl} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <>
                          <Upload size={16} className="text-[#fa7150] mb-1" />
                          <span className="text-[8px] uppercase">Tải lên</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Album bổ sung */}
                <div className="mt-4 pt-3 border-t border-[#e5d8d0]/60">
                  <span className="block text-xs font-bold text-[#8a7e75] mb-2">Album ảnh bổ sung ({hotelForm.imageUrls.length} ảnh)</span>
                  <div className="grid grid-cols-4 gap-2">
                    {hotelForm.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-[#e5d8d0]">
                        <img src={url} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setHotelForm(prev => ({
                            ...prev,
                            imageUrls: prev.imageUrls.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer bg-[#faf9f6]/40 hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] rounded-xl flex flex-col items-center justify-center aspect-video transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!!uploadingHotelField}
                        onChange={e => handleHotelImageUpload(e, 'album')}
                      />
                      <Upload size={14} className="text-[#fa7150] mb-0.5" />
                      <span className="text-[8px] uppercase font-black">Thêm ảnh</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowEditHotelModal(false)}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveHotelDetails}
                disabled={savingHotel}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold bg-[#fa7150] hover:bg-[#a43e24] transition-all disabled:bg-[#ffac98]"
              >
                {savingHotel ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
