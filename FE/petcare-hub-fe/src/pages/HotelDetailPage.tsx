import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  PawPrint,
  MapPin,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Heart,
  Scissors,
  Bookmark,
  ShieldCheck,
  Car,
  Utensils,
  Star,
  ChevronLeft,
  ChevronRight,
  Edit,
  Upload,
  Trash2,
  Loader2,
  Plus,
  AlertCircle,
  AlertTriangle,
  Flag,
  X
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Header } from '@/components/Header'
import { useAuthStore } from '@/store/authStore'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ScrollReveal } from '@/components/ScrollReveal'
import { cleanAddressDisplay } from '@/utils/cleanAddress'

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface RoomType {
  id: string
  name: string
  pricePerNight: number
  dayRate?: number | null
  petType: string
  description: string
  image: string
  isPopular?: boolean
}

interface ExtraService {
  id: string
  name: string
  price: number
  desc: string
  imageUrl?: string
}

interface PetType {
  id: string
  name: string
  breed: string
  avatarUrl: string | null
  species?: string
  ageYears?: number
  weightKg?: number
  specialNotes?: string | null
}

const DEFAULT_ROOMS: RoomType[] = [
  {
    id: 'b8e72c84-9dbb-4ae1-8d2a-71b56ce8145a',
    name: 'Phòng Deluxe Hướng Vườn',
    pricePerNight: 1200000,
    petType: 'Chó & Mèo - Mọi kích cỡ',
    description: 'Căn phòng rộng 20m² với tầm nhìn trực diện ra khu vườn trung tâm. Trang bị nệm memory foam và hệ thống lọc khí chuyên dụng.',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
    isPopular: true
  },
  {
    id: 'a12e3456-789b-12d3-a456-426614174000',
    name: 'Phòng Suite Hoàng Gia Cho Mèo',
    pricePerNight: 2500000,
    petType: 'Chỉ dành cho Mèo',
    description: 'Trải nghiệm hoàng gia với hệ thống leo trèo đa tầng, thác nước mini và chế độ chăm sóc đặc biệt 1-kèm-1.',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
    isPopular: false
  }
]

const DEFAULT_SERVICES: ExtraService[] = [
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81451', name: 'Spa & Massage', price: 450000, desc: 'Liệu trình massage bằng tinh dầu hữu cơ giúp giảm căng thẳng.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81452', name: 'Cắt Tỉa Chuyên Nghiệp', price: 350000, desc: 'Tỉa lông nghệ thuật, cắt móng và vệ sinh tai bởi các chuyên gia.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81453', name: 'Huấn Luyện Cơ Bản', price: 600000, desc: 'Rèn luyện các lệnh cơ bản và cải thiện hành vi xã hội.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81454', name: 'Ẩm Thực Gourmet', price: 200000, desc: 'Thực đơn tươi mới được chế biến hàng ngày bởi bếp trưởng.' }
]

export const HotelDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { scrollY } = useScroll()
  const coverScale = useTransform(scrollY, [0, 480], [1, 1.08])
  const coverY = useTransform(scrollY, [0, 480], [0, 25])

  const [hotelName, setHotelName] = useState('PetCare Sanctuary')
  const [hotelAddress, setHotelAddress] = useState('Đường Nguyễn Thị Minh Khai, Quận 1, TP. HCM')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLong, setLocationLong] = useState<number | null>(null)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [services, setServices] = useState<ExtraService[]>(DEFAULT_SERVICES)
  
  // Hotel details and gallery images states
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [frontUrls, setFrontUrls] = useState<string[]>([])
  const [roomsUrls, setRoomsUrls] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [hotelDescriptionText, setHotelDescriptionText] = useState<string | null>(null)
  const [originalExtraJson, setOriginalExtraJson] = useState<any>(null)
  
  // Additional payload states to support updates
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [amenities, setAmenities] = useState<string[]>([])
  const [checkInTime, setCheckInTime] = useState('14:00')
  const [checkOutTime, setCheckOutTime] = useState('12:00')

  // Carousel slider state
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const allImages = Array.from(
    new Set([
      logoUrl,
      ...(frontUrls || []),
      ...(roomsUrls || []),
      ...(imageUrls || [])
    ].filter(Boolean))
  ) as string[]

  const handleNextImage = () => {
    if (allImages.length === 0) return
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const handlePrevImage = () => {
    if (allImages.length === 0) return
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  // Tự động chuyển ảnh cơ sở vật chất sau mỗi 5 giây
  useEffect(() => {
    if (allImages.length <= 1) return
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [allImages.length])

  // Edit modals state
  const [isEditDescOpen, setIsEditDescOpen] = useState(false)
  const [isEditImagesOpen, setIsEditImagesOpen] = useState(false)

  // Edit inputs state
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editFrontUrls, setEditFrontUrls] = useState<string[]>([])
  const [editRoomsUrls, setEditRoomsUrls] = useState<string[]>([])
  const [editImageUrls, setEditImageUrls] = useState<string[]>([])
  const [editDescriptionText, setEditDescriptionText] = useState('')
  const [editAmenities, setEditAmenities] = useState<string[]>([])
  const [updating, setUpdating] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  // Show profile or booking flow
  const [showBookingFlow, setShowBookingFlow] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  
  // Trạng thái Stepper: 1 -> 5
  const [step, setStep] = useState<number>(1)

  // Trạng thái đặt phòng
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [nights, setNights] = useState(1)
  const [bookingType, setBookingType] = useState<'OVERNIGHT' | 'DAYCARE'>('OVERNIGHT')
  const [days, setDays] = useState(1)
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [entryTime, setEntryTime] = useState('08:00')
  const [exitTime, setExitTime] = useState('18:00')
  
  // Trạng thái thú cưng
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [petNameInput, setPetNameInput] = useState('')
  const [petBreedInput, setPetBreedInput] = useState('')
  const [petAgeInput, setPetAgeInput] = useState('')
  const [petWeightInput, setPetWeightInput] = useState('')
  const [specialRequestInput, setSpecialRequestInput] = useState('')

  // Trạng thái mã giảm giá
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')

  // Trạng thái chọn phương thức thanh toán
  const [_paymentMethod, _setPaymentMethod] = useState<'VIETQR' | 'MOMO' | 'VNPAY'>('VIETQR')
  const [payosData, setPayosData] = useState<any>(null)
  const [loadingPayos, setLoadingPayos] = useState(false)

  // Trạng thái tải dữ liệu & tạo đơn
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, number | null>>({})
  const [invoiceNumber, setInvoiceNumber] = useState('')

  // Polling trạng thái thanh toán
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Custom Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // ── Hotel Report States ──
  const [hasReported, setHasReported] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('Lừa đảo')
  const [reportDetail, setReportDetail] = useState('')
  const [reportImages, setReportImages] = useState<string[]>([])
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    if (isEditDescOpen || isEditImagesOpen || toast || showReportModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isEditDescOpen, isEditImagesOpen, toast, showReportModal])

  useEffect(() => {
    const checkReportedStatus = async () => {
      if (!user || user.role !== 'OWNER' || !id) return
      try {
        const res = await axiosInstance.get(`/api/reports/hotels/${id}/check`)
        setHasReported(res.data?.reported || false)
      } catch (err) {
        console.error('Failed to check reported status', err)
      }
    }
    checkReportedStatus()
  }, [user, id])

  const handleReportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    if (reportImages.length + files.length > 3) {
      alert('Bạn chỉ được upload tối đa 3 ảnh chứng cứ.')
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        alert(validation.message)
        return
      }
      
      setUploadingField('reportImages')
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const res = await axiosInstance.post('/api/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setReportImages(prev => [...prev, res.data.url])
      } catch (err) {
        console.error('Failed to upload report image', err)
        alert('Không thể tải ảnh lên. Vui lòng thử lại.')
      } finally {
        setUploadingField(null)
      }
    }
  }

  const handleRemoveReportImage = (indexToRemove: number) => {
    setReportImages(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleOpenReportModal = () => {
    setReportReason('Lừa đảo')
    setReportDetail('')
    setReportImages([])
    setShowReportModal(true)
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportDetail.trim()) {
      alert('Vui lòng nhập mô tả chi tiết nội dung vi phạm.')
      return
    }
    setSubmittingReport(true)
    try {
      await axiosInstance.post(`/api/reports/hotels/${id}`, {
        reason: `[${reportReason}] ${reportDetail.trim()}`,
        imageUrls: reportImages
      })
      // Dispatch notification to client's own notification bell
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: 'Báo cáo vi phạm đã gửi',
          message: `Cảm ơn bạn đã gửi báo cáo vi phạm về cơ sở "${hotelName || 'khách sạn'}". Ban quản trị sẽ xem xét và xử phạt trong thời gian sớm nhất.`,
          type: 'message'
        }
      }))
      alert('Gửi báo cáo vi phạm thành công! Ban quản trị sẽ sớm xem xét xử lý.')
      setHasReported(true)
      setShowReportModal(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.')
    } finally {
      setSubmittingReport(false)
    }
  }
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ type, message })
  }
  const pollStartRef = useRef<number | null>(null)
  const POLL_INTERVAL_MS = 4000
  const POLL_MAX_MS = 15 * 60 * 1000 // 15 phút

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  useEffect(() => {
    if (!currentBookingId || !isSuccess || paymentConfirmed) return

    pollStartRef.current = Date.now()

    pollingRef.current = setInterval(async () => {
      if (Date.now() - (pollStartRef.current ?? 0) > POLL_MAX_MS) {
        stopPolling()
        return
      }
      try {
        const res = await axiosInstance.get(`/api/payment/verify/${currentBookingId}`)
        if (res.data?.bookingStatus === 'CONFIRMED') {
          stopPolling()
          setPaymentConfirmed(true)
        }
      } catch {
        // lỗi mạng tạm thời — thử lại lần sau
      }
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  }, [currentBookingId, isSuccess, paymentConfirmed])


  useEffect(() => {
    const loadDetails = async () => {
      try {
        const hotelRes = await axiosInstance.get(`/api/hotels/${id}`)
        if (hotelRes.data) {
          setHotelName(hotelRes.data.name)
          setHotelAddress(cleanAddressDisplay(hotelRes.data.address || 'Hồ Chí Minh, Việt Nam'))
          setLocationLat(hotelRes.data.locationLat)
          setLocationLong(hotelRes.data.locationLong)
          setGoogleMapsUrl(hotelRes.data.googleMapsUrl)
          setPartnerId(hotelRes.data.partnerId)
          setAmenities(hotelRes.data.amenities || [])
          setCheckInTime(hotelRes.data.checkInTime || '14:00')
          setCheckOutTime(hotelRes.data.checkOutTime || '12:00')
          
          const desc = hotelRes.data.description
          if (desc && desc.trim().startsWith('{')) {
            try {
              const extra = JSON.parse(desc)
              setOriginalExtraJson(extra)
              setLogoUrl(extra.logoUrl || null)
              const parsedFront = Array.isArray(extra.frontUrl) ? extra.frontUrl : (extra.frontUrl ? [extra.frontUrl] : [])
              const parsedRooms = Array.isArray(extra.roomsUrl) ? extra.roomsUrl : (extra.roomsUrl ? [extra.roomsUrl] : [])
              setFrontUrls(parsedFront)
              setRoomsUrls(parsedRooms)
              setImageUrls(extra.imageUrls || [])
              setHotelDescriptionText(extra.description || null)

              // Prepopulate edit states
              setEditLogoUrl(extra.logoUrl || '')
              setEditFrontUrls(parsedFront)
              setEditRoomsUrls(parsedRooms)
              setEditImageUrls(extra.imageUrls || [])
              setEditDescriptionText(extra.description || '')
            } catch (e) {
              console.error('Failed to parse hotel description JSON:', e)
            }
          } else {
            setHotelDescriptionText(desc || null)
            setEditDescriptionText(desc || '')
          }
        }


        const translatePetTypes = (types: string[] | undefined | null) => {
          if (!types || types.length === 0) return 'Chó & Mèo'
          const mapping: { [key: string]: string } = {
            'DOG': 'Chó',
            'CAT': 'Mèo',
            'SMALL': 'Thú nhỏ',
            'DOG_SMALL': 'Chó nhỏ',
            'CAT_SMALL': 'Mèo nhỏ',
            'ALL': 'Tất cả thú cưng'
          }
          return types.map(t => mapping[t.toUpperCase().trim()] || t).join(', ')
        }

        const translateRoomName = (name: string) => {
          const mapping: { [key: string]: string } = {
            'Standard Cozy Room': 'Phòng Tiêu Chuẩn Ấm Cúng',
            'Deluxe Garden View': 'Phòng Deluxe Hướng Vườn',
            'Royal Cat Suite': 'Phòng Suite Hoàng Gia Cho Mèo'
          }
          return mapping[name] || name
        }

        const roomsRes = await axiosInstance.get(`/api/room-types/hotel/${id}`)
        if (roomsRes.data && roomsRes.data.length > 0) {
          const list = roomsRes.data.map((r: any) => ({
            id: r.id,
            name: translateRoomName(r.name),
            pricePerNight: r.pricePerNight,
            dayRate: r.dayRate,
            petType: translatePetTypes(r.allowedPetTypes),
            description: r.description || 'Không gian ấm cúng, đầy đủ tiện ích cơ bản cho bé cưng.',
            image: r.images && r.images.length > 0 ? r.images[0] : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800'
          }))
          setRoomTypes(list)
          setSelectedRoomId(list[0].id)
        }

        const servicesRes = await axiosInstance.get(`/api/services/hotel/${id}`)
        if (servicesRes.data && servicesRes.data.length > 0) {
          const list = servicesRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            desc: s.description || 'Gói dịch vụ chăm sóc tiện ích bổ sung.',
            imageUrl: s.imageUrl || ''
          }))
          setServices(list)
        }

        // Fetch reviews
        try {
          const reviewsRes = await axiosInstance.get(`/api/reviews/hotel/${id}`)
          if (reviewsRes.data) {
            setReviews(reviewsRes.data.content || reviewsRes.data || [])
          }
        } catch (e) {
          console.error('Failed to load hotel reviews:', e)
        }
      } catch (error) {
        console.error('Failed to fetch details, falling back to mock data', error)
      }

      try {
        const petsRes = await axiosInstance.get('/api/pets/my')
        if (petsRes.data && petsRes.data.length > 0) {
          setPets(petsRes.data)
          setSelectedPetId(petsRes.data[0].id)
        }
      } catch (error) {
        console.error('Failed to load user pets', error)
      } finally {
        setLoading(false)
      }
    }
    loadDetails()
  }, [id])

  // Khi thay đổi thú cưng được chọn, tự động điền thông tin
  useEffect(() => {
    if (selectedPetId) {
      const selected = pets.find(p => p.id === selectedPetId)
      if (selected) {
        setPetNameInput(selected.name)
        setPetBreedInput(selected.breed || '')
        setPetAgeInput(selected.ageYears !== undefined ? selected.ageYears.toString() : '1')
        setPetWeightInput(selected.weightKg !== undefined ? selected.weightKg.toString() : '5')
        // Parse specialNotes JSON to extract only the human-readable note
        let noteText = ''
        if (selected.specialNotes) {
          try {
            const parsed = JSON.parse(selected.specialNotes)
            noteText = parsed.SpecialNotes || parsed.specialNotes || ''
            // Filter out default placeholder text
            if (noteText === 'Chưa có ghi chú nào') noteText = ''
          } catch {
            // If not valid JSON, use the raw string as-is
            noteText = selected.specialNotes
          }
        }
        setSpecialRequestInput(noteText)
      }
    }
  }, [selectedPetId, pets])

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'PETWELCOME10') {
      setDiscountPercent(10)
      setCouponMessage('Đã áp dụng mã giảm giá PETWELCOME10 (-10%)')
    } else {
      setDiscountPercent(0)
      setCouponMessage('Mã giảm giá không hợp lệ hoặc đã hết hạn.')
    }
  }

  const handleToggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(sid => sid !== serviceId))
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId])
    }
  }

  // Tính toán chi phí — công thức: totalAmount = (room + services − voucher) × 1.08 (VAT 8%)
  const activeRoom = roomTypes.find(r => r.id === selectedRoomId) || DEFAULT_ROOMS[0]
  const roomCost = bookingType === 'DAYCARE'
    ? (activeRoom.dayRate || 0) * days
    : activeRoom.pricePerNight * nights
  const selectedServicesList = services.filter(s => selectedServiceIds.includes(s.id))
  const servicesCost = selectedServicesList.reduce((sum, s) => sum + s.price, 0)

  const subTotal = roomCost + servicesCost
  const voucherDiscountAmount = discountPercent > 0 ? Math.round(subTotal * discountPercent / 100) : 0
  const taxableBase = subTotal - voucherDiscountAmount
  const vatAmount = Math.round(taxableBase * 0.08)
  const totalCost = taxableBase + vatAmount

  // Tính nights/days từ checkIn/checkOut
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const diff = Math.round(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime())
        / (1000 * 60 * 60 * 24)
      )
      if (bookingType === 'OVERNIGHT') {
        setNights(diff > 0 ? diff : 0)
      } else {
        setDays(diff >= 0 ? diff + 1 : 1)
      }
    } else {
      setNights(0)
      setDays(1)
    }
  }, [checkInDate, checkOutDate, bookingType])

  // Fetch số phòng còn trống cho mỗi loại phòng theo ngày đang chọn
  useEffect(() => {
    if (roomTypes.length === 0) return
    const today = new Date()
    const todayStr = getLocalDateString(today)
    const tomorrowStr = getLocalDateString(new Date(today.getTime() + 86400000))
    const ci = checkInDate  || todayStr
    const co = checkOutDate || tomorrowStr
    // Validate dates before calling API to avoid 400 errors
    if (bookingType === 'OVERNIGHT' && co <= ci) return
    if (bookingType === 'DAYCARE' && co < ci) return
    Promise.all(
      roomTypes.map(rt =>
        axiosInstance
          .get<number>(`/api/room-types/${rt.id}/availability`, {
            params: { checkIn: ci, checkOut: co, bookingType }
          })
          .then(res => ({ id: rt.id, count: res.data as number }))
          .catch(() => ({ id: rt.id, count: null as null }))
      )
    ).then(results => {
      setAvailabilityMap(Object.fromEntries(results.map(r => [r.id, r.count])))
    })
  }, [roomTypes, checkInDate, checkOutDate, bookingType])

  // Tự động chuyển về OVERNIGHT nếu loại phòng đã chọn không hỗ trợ gửi ngày
  useEffect(() => {
    if (bookingType === 'DAYCARE' && activeRoom && !activeRoom.dayRate) {
      setBookingType('OVERNIGHT')
      if (checkOutDate && checkOutDate <= checkInDate) {
        setCheckOutDate('')
      }
    }
  }, [selectedRoomId, roomTypes, activeRoom, bookingType, checkInDate, checkOutDate])

  const validateImageFile = (file: File): { isValid: boolean; message: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Chỉ chấp nhận .jpg, .jpeg, .png, .webp, .avif, .gif.`
      };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPEG, PNG, WebP hoặc AVIF.`
      };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: `Kích thước ảnh "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ảnh dưới 5MB.`
      };
    }

    return { isValid: true, message: '' };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      showToast(validation.message, 'error')
      e.target.value = ''
      return
    }

    setUploadingField(fieldKey)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      const url = res.data.url
      if (fieldKey === 'logo') {
        setEditLogoUrl(url)
      } else if (fieldKey === 'front') {
        setEditFrontUrls(prev => [...prev, url])
      } else if (fieldKey === 'rooms') {
        setEditRoomsUrls(prev => [...prev, url])
      } else if (fieldKey === 'album') {
        setEditImageUrls(prev => [...prev, url])
      }
    } catch (err) {
      console.error('File upload failed', err)
      showToast('Không thể tải ảnh lên. Vui lòng thử lại.', 'error')
    } finally {
      setUploadingField(null)
      e.target.value = ''
    }
  }

  const isPartnerOwner = user && (user.role === 'ADMIN' || (user.role === 'PARTNER' && partnerId === user.id))

  const handleUpdateHotelDetail = async (updatedDescText: string, updatedLogo: string, updatedFront: string[], updatedRooms: string[], updatedAlbum: string[], updatedAmenities: string[]) => {
    setUpdating(true)
    try {
      const updatedExtra = {
        ...originalExtraJson,
        logoUrl: updatedLogo,
        frontUrl: updatedFront,
        roomsUrl: updatedRooms,
        imageUrls: updatedAlbum,
        description: updatedDescText
      }
      
      const payload = {
        name: hotelName,
        address: hotelAddress,
        locationLat: locationLat,
        locationLong: locationLong,
        googleMapsUrl: googleMapsUrl,
        description: JSON.stringify(updatedExtra),
        amenities: updatedAmenities,
        checkInTime: checkInTime,
        checkOutTime: checkOutTime
      }

      const res = await axiosInstance.put(`/api/hotels/${id}`, payload)
      if (res.data) {
        setLogoUrl(updatedLogo || null)
        setFrontUrls(updatedFront)
        setRoomsUrls(updatedRooms)
        setImageUrls(updatedAlbum)
        setHotelDescriptionText(updatedDescText || null)
        setAmenities(updatedAmenities)
        
        setIsEditDescOpen(false)
        setIsEditImagesOpen(false)
        showToast('Cập nhật thông tin khách sạn thành công!', 'success')
      }
    } catch (error: any) {
      console.error('Failed to update hotel details', error)
      showToast(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin khách sạn. Hãy chắc chắn bạn đã điền đầy đủ và đúng định dạng.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateBooking = async () => {
    if (!selectedPetId && !petNameInput) {
      showToast('Bạn phải điền thông tin thú cưng trước khi đặt phòng!', 'info')
      return
    }

    setBookingLoading(true)
    try {
      const payload = {
        hotelId: id,
        roomTypeId: selectedRoomId,
        checkInDate: checkInDate || getLocalDateString(new Date()),
        checkOutDate: checkOutDate || getLocalDateString(new Date(Date.now() + 86400000 * nights)),
        petIds: [selectedPetId || '00000000-0000-0000-0000-000000000000'],
        serviceIds: selectedServiceIds,
        voucherCode: discountPercent > 0 ? couponCode : null,
        paymentMethod: 'VIETQR',
        bookingType: bookingType,
        dropOffTime: bookingType === 'DAYCARE' ? `${entryTime}:00` : null,
        pickUpTime: bookingType === 'DAYCARE' ? `${exitTime}:00` : null
      }

      const response = await axiosInstance.post('/api/bookings', payload)
      if (response.data) {
        setInvoiceNumber(response.data.invoiceNumber || 'INV-' + Date.now())
        setCurrentBookingId(response.data.id)
        setIsSuccess(true)
        setLoadingPayos(true)
        try {
          const payRes = await axiosInstance.post('/api/payment/create-payment-link', {
            bookingId: response.data.id
          })
          if (payRes.data) {
            setPayosData(payRes.data)
          }
        } catch (payErr: any) {
          console.error('Lỗi khi tạo payment link payOS:', payErr)
        } finally {
          setLoadingPayos(false)
        }
      }
    } catch (error: any) {
      console.error('Failed to create booking', error)
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi đặt phòng. Vui lòng kiểm tra lại vai trò của bạn.'
      showToast(msg, 'error')
      if (error.response?.status === 409) {
        // Phòng hết chỗ — cập nhật ngay map để nút bị disable
        setAvailabilityMap(prev => ({ ...prev, [selectedRoomId]: 0 }))
      }
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24 text-left">
      <Header />

      {/* MODAL THÀNH CÔNG */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-[#e1e3df] animate-in fade-in zoom-in duration-300">

            {/* ── Nhánh CONFIRMED: thanh toán thành công ── */}
            {paymentConfirmed ? (
              <>
                <div className="w-16 h-16 bg-[#d0fac0] text-[#44683b] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-black text-[#44683b] mb-1">Thanh toán thành công!</h3>
                <p className="text-xs text-[#5d605c] mb-2">
                  Mã hóa đơn: <strong className="text-[#a43e24]">{invoiceNumber}</strong>
                </p>
                <p className="text-xs text-[#5d605c] mb-6">
                  Trạng thái: <span className="font-bold text-[#44683b]">CONFIRMED — Đã xác nhận</span>
                </p>
                <p className="text-[10px] text-[#8a7e75] mb-6">
                  Đặt phòng của bạn đã được xác nhận. Chúng tôi sẽ liên hệ để sắp xếp nhận bé cưng.
                </p>
                <button
                  onClick={() => navigate('/my-bookings')}
                  className="w-full bg-[#44683b] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Xem lịch sử đặt phòng <ArrowRight size={14} />
                </button>
              </>
            ) : (
              /* ── Nhánh PENDING: đang chờ thanh toán ── */
              <>
                <div className="w-16 h-16 bg-[#d0fac0] text-[#44683b] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>

                <h3 className="text-2xl font-black text-[#303330] mb-1">Đặt phòng thành công!</h3>
                <p className="text-xs text-[#5d605c] mb-2">
                  Mã hóa đơn: <strong className="text-[#a43e24]">{invoiceNumber}</strong>
                </p>
                <p className="text-xs text-[#5d605c] mb-4">
                  Trạng thái: <span className="font-bold text-amber-600">PENDING — Chờ thanh toán</span>
                </p>

                {/* Indicator đang poll */}
                <div className="flex items-center justify-center gap-2 mb-4 text-[10px] text-[#8a7e75]">
                  <span className="w-3 h-3 rounded-full border-2 border-[#a43e24]/30 border-t-[#a43e24] animate-spin inline-block" />
                  Đang chờ xác nhận thanh toán...
                </div>

                {/* QR thanh toán */}
                {loadingPayos && (
                  <div className="bg-[#f4f4f0] border border-[#e1e3df] rounded-2xl p-8 mb-4 flex flex-col items-center justify-center min-h-[220px]">
                    <span className="w-8 h-8 rounded-full border-4 border-[#a43e24]/20 border-t-[#a43e24] animate-spin inline-block mb-3" />
                    <p className="text-xs text-[#8a7e75] font-bold">Đang tạo mã QR payOS...</p>
                  </div>
                )}

                {!loadingPayos && payosData && (
                  <div className="bg-[#f4f4f0] border border-[#e1e3df] rounded-2xl p-4 mb-4">
                    <img
                      src={`https://img.vietqr.io/image/${payosData.bin}-${payosData.accountNumber}-compact2.png?amount=${payosData.amount}&addInfo=${payosData.description}&accountName=${encodeURIComponent(payosData.accountName)}`}
                      alt="QR thanh toán"
                      className="w-52 h-52 mx-auto rounded-xl shadow-sm border border-stone-200"
                    />
                    <p className="text-[10px] font-black text-[#a43e24] uppercase tracking-wider mt-2">
                      Quét VietQR để thanh toán
                    </p>
                    <p className="text-[10px] text-[#5d605c] mt-0.5 font-bold">
                      Số tiền: {payosData.amount.toLocaleString('vi-VN')}đ
                    </p>
                    <a
                      href={payosData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 text-xs text-[#a43e24] hover:underline font-black block"
                    >
                      Mở cổng thanh toán payOS ↗
                    </a>
                  </div>
                )}

                {!loadingPayos && !payosData && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-4 text-center">
                    <p className="text-xs text-rose-700 font-bold">
                      Không thể kết nối cổng thanh toán payOS. Vui lòng thanh toán lại sau trong Lịch sử đặt phòng.
                    </p>
                  </div>
                )}

                {payosData && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                    <p className="text-xs font-bold text-amber-700">Nội dung chuyển khoản:</p>
                    <p className="text-sm font-black text-amber-900 mt-1">{payosData.description}</p>
                  </div>
                )}

                <p className="text-[10px] text-[#8a7e75] mb-4">
                  Trang sẽ tự động cập nhật khi thanh toán được xác nhận.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => { stopPolling(); navigate('/my-bookings') }}
                    className="flex-1 bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    Xem lịch sử đặt phòng <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEPPER HEADER INDICATOR ── */}
      {showBookingFlow && (
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <div className="flex items-center justify-between py-6 border-b border-[#e1e3df] flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { s: 1, label: 'Chọn phòng' },
                { s: 2, label: 'Thông tin' },
                { s: 3, label: 'Dịch vụ' },
                { s: 4, label: 'Xác nhận' },
                { s: 5, label: 'Thanh toán' }
              ].map((item, idx) => {
                const isCompleted = step > item.s
                const isActive = step === item.s
                return (
                  <div key={item.s} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                      isCompleted ? 'bg-[#a43e24] border-[#a43e24] text-white' :
                      isActive ? 'bg-[#feeadb] border-[#a43e24] text-[#a43e24]' :
                      'bg-white border-[#e1e3df] text-[#8a7e75]'
                    }`}>
                      {isCompleted ? <CheckCircle size={14} /> : item.s}
                    </div>
                    <span className={`text-xs font-bold ${isActive ? 'text-[#303330]' : 'text-[#8a7e75]'}`}>
                      {item.label}
                    </span>
                    {idx < 4 && (
                      <div className={`w-12 h-0.5 rounded-full ${step > item.s ? 'bg-[#a43e24]' : 'bg-[#e1e3df]'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            <button 
              onClick={() => {
                setShowBookingFlow(false)
                setStep(1)
              }}
              className="px-4 py-2 text-xs font-bold text-[#a43e24] hover:bg-[#a43e24]/10 rounded-full border border-[#a43e24]/30 transition-all"
            >
              Thoát trình đặt phòng
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* ── PROFILE & INTRODUCTION VIEW ── */}
        {!showBookingFlow && (
          <div className="space-y-10">
            {/* Header Section */}
            <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e1e3df] pb-6">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Hotel Logo" 
                    className="w-20 h-20 rounded-full border-4 border-[#feeadb] object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#feeadb] text-[#a43e24] flex items-center justify-center font-black text-2xl border-4 border-[#faf9f6] shadow-md shrink-0">
                    {hotelName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: '#303330' }}>
                    {hotelName}
                  </h1>
                  <p className="text-[#5d605c] flex items-center gap-1.5 text-xs sm:text-sm mt-2">
                    <MapPin size={14} className="text-[#a43e24]" />
                    {hotelAddress}
                    {googleMapsUrl && (
                      <a 
                        href={googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#a43e24] hover:underline font-bold"
                      >
                        (Xem trên Google Maps ↗)
                      </a>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Rating Summary & Report */}
              <div className="flex flex-col items-end gap-2 self-start md:self-auto">
                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-[#e1e3df] shadow-sm">
                  <div className="flex text-amber-400">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-[#303330]">
                      {reviews.length > 0 
                        ? (reviews.reduce((acc, r) => acc + (r.starRating || 0), 0) / reviews.length).toFixed(1) 
                        : '5.0'} / 5.0
                    </p>
                    <p className="text-[10px] text-[#8a7e75] font-bold">({reviews.length} đánh giá)</p>
                  </div>
                </div>

                {user && user.role === 'OWNER' && (
                  <button
                    onClick={handleOpenReportModal}
                    disabled={hasReported}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm border ${
                      hasReported
                        ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-white border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer'
                    }`}
                  >
                    <Flag size={12} className={hasReported ? 'text-stone-300' : 'text-rose-500'} />
                    {hasReported ? 'Đã báo cáo vi phạm' : 'Báo cáo vi phạm'}
                  </button>
                )}
              </div>
            </div>
            </ScrollReveal>

            {/* Elegant Image Slideshow Carousel */}
            <ScrollReveal delay={0.1}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#8a7e75] uppercase tracking-wider">Hình ảnh cơ sở vật chất</span>
                {isPartnerOwner && (
                  <button
                    onClick={() => {
                      setEditLogoUrl(logoUrl || '')
                      setEditFrontUrls(frontUrls || [])
                      setEditRoomsUrls(roomsUrls || [])
                      setEditImageUrls(imageUrls || [])
                      setIsEditImagesOpen(true)
                    }}
                    className="px-4 py-2 rounded-full border border-[#a43e24]/30 text-xs font-black text-[#a43e24] hover:bg-[#a43e24]/10 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit size={14} /> Chỉnh sửa hình ảnh
                  </button>
                )}
              </div>

              <div className="relative h-80 md:h-[480px] rounded-3xl overflow-hidden shadow-lg group bg-stone-100">
                {allImages.length > 0 ? (
                  allImages.map((imgUrl, idx) => (
                    <motion.img 
                      key={imgUrl + idx}
                      src={imgUrl} 
                      alt={`${hotelName} slide ${idx + 1}`} 
                      style={idx === currentImageIndex ? { y: coverY, scale: coverScale } : undefined}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                        idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    />
                  ))
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Chưa có ảnh cơ sở vật chất</span>
                  </div>
                )}
                
                {/* Prev Button */}
                {allImages.length > 1 && (
                  <button 
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-[#303330] flex items-center justify-center shadow-md transition-all border border-[#e1e3df] hover:scale-105 active:scale-95 z-20"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}

                {/* Next Button */}
                {allImages.length > 1 && (
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-[#303330] flex items-center justify-center shadow-md transition-all border border-[#e1e3df] hover:scale-105 active:scale-95 z-20"
                  >
                    <ChevronRight size={22} />
                  </button>
                )}

                {/* Indicators */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/25 px-4 py-2.5 rounded-full backdrop-blur-md">
                    {allImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all cursor-pointer border-none outline-none ${
                          idx === currentImageIndex 
                            ? 'bg-white w-5 shadow-sm' 
                            : 'bg-white/40 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            </ScrollReveal>

            {/* Two Column Layout: Main Profile Info vs Booking Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: About, Rooms, Map, Reviews */}
              <div className="lg:col-span-8 space-y-10">
                {/* About Section */}
                <ScrollReveal delay={0.1}>
                <div className="p-8 bg-white rounded-3xl border border-[#e1e3df] shadow-sm text-left">
                  <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-xl font-black text-[#303330] flex items-center gap-2">
                      <Sparkles size={20} className="text-[#fa7150]" /> Giới thiệu khách sạn
                    </h2>
                    {isPartnerOwner && (
                      <button
                        onClick={() => {
                          setEditDescriptionText(hotelDescriptionText || '')
                          setEditAmenities(amenities)
                          setIsEditDescOpen(true)
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-[#e1e3df] text-xs font-black text-[#a43e24] hover:bg-[#a43e24]/10 transition-all flex items-center gap-1.5"
                      >
                        <Edit size={14} /> Chỉnh sửa mô tả
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-[#5d605c] leading-relaxed space-y-3 whitespace-pre-line">
                    {hotelDescriptionText || 'Chào mừng bạn đến với khách sạn thú cưng của chúng tôi! Nơi mang đến cho bé cưng của bạn trải nghiệm nghỉ dưỡng 5 sao chất lượng hàng đầu. Với phòng ốc tiện nghi, chế độ dinh dưỡng khoa học và sự chăm sóc chu đáo từ đội ngũ nhân viên giàu kinh nghiệm.'}
                  </div>
                </div>
                </ScrollReveal>

                {/* Rooms List Section */}
                <ScrollReveal delay={0.15}>
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-[#303330] text-left">Danh sách loại phòng hiện có</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roomTypes.map((room, roomIndex) => (
                      <ScrollReveal
                        key={room.id}
                        delay={Math.min(roomIndex, 4) * 0.08}
                        direction="up"
                        distance={30}
                      >
                      <div 
                        className="bg-white rounded-3xl overflow-hidden border border-[#e1e3df] hover:border-[#a43e24] hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full"
                      >
                        <div className="h-48 relative overflow-hidden">
                          <img className="w-full h-full object-cover" src={room.image} alt={room.name} />
                          {room.isPopular && (
                            <span className="absolute top-4 left-4 bg-[#a43e24] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                              Phổ biến
                            </span>
                          )}
                        </div>
                        <div className="p-6 text-left flex flex-col justify-between flex-grow">
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-start gap-4">
                              <h3 className="text-lg font-bold text-[#303330]">{room.name}</h3>
                              <span className="text-[#a43e24] font-black text-base shrink-0 flex flex-col items-end">
                                <span>{room.pricePerNight.toLocaleString('vi-VN')} đ<span className="text-xs font-normal text-stone-500">/đêm</span></span>
                                {room.dayRate !== undefined && room.dayRate !== null && (
                                  <span className="text-xs text-stone-500 font-semibold mt-1">Gửi ngày: {room.dayRate.toLocaleString('vi-VN')} đ</span>
                                )}
                              </span>
                            </div>
                            <span className="inline-block text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full uppercase tracking-wider">
                              {room.petType}
                            </span>
                            <p className="text-xs text-[#5d605c] leading-relaxed line-clamp-3">{room.description}</p>
                          </div>
                          {(() => {
                            const avail = availabilityMap[room.id]
                            const isFull = avail !== undefined && avail !== null && avail <= 0
                            return (
                              <>
                                {avail != null && (
                                  <p className={`text-xs font-bold mb-3 ${isFull ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {isFull ? 'Hết phòng trong thời gian đã chọn' : `Còn ${avail} phòng trống`}
                                  </p>
                                )}
                                <button
                                  disabled={isFull}
                                  onClick={() => {
                                    if (!user) {
                                      navigate('/login', { state: { from: `/hotels/${id}` } })
                                    } else {
                                      setSelectedRoomId(room.id)
                                      setShowBookingFlow(true)
                                      setStep(2)
                                    }
                                  }}
                                  className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    isFull
                                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                      : 'bg-[#a43e24] text-white hover:bg-[#a43e24]/90'
                                  }`}
                                >
                                  {isFull ? 'Hết phòng' : (<>Đặt ngay phòng này <ArrowRight size={14} /></>)}
                                </button>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
                </ScrollReveal>



                {/* Reviews List Section */}
                <ScrollReveal delay={0.1}>
                <div className="space-y-6 text-left">
                  <h2 className="text-2xl font-black text-[#303330]">Nhận xét từ khách hàng ({reviews.length})</h2>
                  
                  {reviews.length === 0 ? (
                    <div className="bg-[#faf9f6] border border-[#e1e3df] rounded-2xl p-8 text-center text-[#8a7e75] font-semibold text-sm">
                      Chưa có nhận xét nào cho khách sạn này. Hãy là người đầu tiên trải nghiệm và chia sẻ ý kiến của bạn!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reviews.map((rev: any, revIndex: number) => (
                        <ScrollReveal key={rev.id} delay={Math.min(revIndex, 3) * 0.1} distance={25}>
                        <div className="bg-white p-6 rounded-3xl border border-[#e1e3df] shadow-sm flex flex-col justify-between space-y-4 h-full">
                          <div className="space-y-3">
                            {/* User Header */}
                            <div className="flex items-center gap-3">
                              {rev.reviewerAvatar ? (
                                <img 
                                  src={rev.reviewerAvatar} 
                                  alt={rev.reviewerName} 
                                  className="w-10 h-10 rounded-full object-cover border border-[#e1e3df]"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#feeadb] text-[#a43e24] flex items-center justify-center font-bold text-sm">
                                  {(rev.reviewerName || 'K').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-[#303330]">{rev.reviewerName || 'Khách hàng ẩn danh'}</h4>
                                <span className="text-[9px] text-[#8a7e75] font-semibold">
                                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                                </span>
                              </div>
                            </div>

                            {/* Stars */}
                            <div className="flex text-amber-400 gap-0.5">
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Star 
                                  key={idx} 
                                  size={14} 
                                  fill={idx < (rev.starRating || 5) ? 'currentColor' : 'none'} 
                                  className={idx < (rev.starRating || 5) ? 'text-amber-400' : 'text-stone-300'}
                                />
                              ))}
                            </div>

                            {/* Comment */}
                            {rev.comment && (
                              <p className="text-xs text-[#5d605c] leading-relaxed italic">
                                "{rev.comment}"
                              </p>
                            )}
                          </div>

                          {/* Review Photos */}
                          {rev.photoUrls && rev.photoUrls.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {rev.photoUrls.map((url: string, index: number) => (
                                <img 
                                  key={index} 
                                  src={url} 
                                  alt={`Ảnh review ${index + 1}`} 
                                  className="w-14 h-14 object-cover rounded-xl border border-stone-200"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        </ScrollReveal>
                      ))}
                    </div>
                  )}
                </div>
                </ScrollReveal>

              </div>

              {/* Right Column: Sticky Sidebar booking widget */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] shadow-md sticky top-6 space-y-6 text-left">
                  <div>
                    <p className="text-[#8a7e75] text-xs font-bold uppercase tracking-wider">Giá khởi điểm từ</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      {roomTypes && roomTypes.length > 0 ? (
                        <>
                          <span className="text-3xl font-black text-[#a43e24]">
                            {roomTypes[0].pricePerNight.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-[#8a7e75]">/đêm</span>
                        </>
                      ) : (
                        <span className="text-xl font-black text-[#a43e24]">
                          Chưa có phòng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-3 pt-4 border-t border-[#e1e3df] text-xs text-[#5d605c]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#44683b]" />
                      <span>Thanh toán an toàn, bảo mật qua VietQR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-[#44683b]" />
                      <span>Xác nhận đặt phòng nhanh chóng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PawPrint size={16} className="text-[#44683b]" />
                      <span>Hỗ trợ chó & mèo mọi kích cỡ</span>
                    </div>
                  </div>

                  <button 
                    disabled={!roomTypes || roomTypes.length === 0}
                    onClick={() => {
                      if (!user) {
                        navigate('/login', { state: { from: `/hotels/${id}` } })
                      } else {
                        setShowBookingFlow(true)
                        setStep(1) // Start from Step 1
                      }
                    }}
                    className={`w-full py-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      !roomTypes || roomTypes.length === 0
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                        : 'bg-[#a43e24] text-[#faf9f6] hover:bg-[#a43e24]/90 shadow-lg shadow-[#a43e24]/10 transition-all duration-300'
                    }`}
                  >
                    Đặt phòng ngay <ArrowRight size={14} />
                  </button>

                  <p className="text-[10px] text-center text-[#8a7e75] font-semibold">
                    Đảm bảo chất lượng chăm sóc bé yêu hàng đầu
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── BƯỚC 1: CHỌN PHÒNG (TRONG TRÌNH ĐẶT PHÒNG) ── */}
        {showBookingFlow && step === 1 && (
          <div>
            <header className="mb-8 text-left flex justify-between items-end flex-wrap gap-4">
              <div>
                <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 1: Chọn nơi lưu trú</span>
                <h2 className="text-3xl font-black text-[#303330] mt-1">
                  Chọn Loại Phòng
                </h2>
                <p className="text-sm text-[#5d605c] mt-1">Vui lòng chọn loại phòng phù hợp cho thú cưng của bạn.</p>
              </div>
              <button
                onClick={() => setShowBookingFlow(false)}
                className="px-5 py-2.5 rounded-full border border-[#e1e3df] text-xs font-bold text-[#a43e24] hover:bg-stone-50 transition-all flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Quay lại Trang giới thiệu
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {loading ? (
                <div className="col-span-2 text-center py-12 text-stone-500 font-bold">Đang tải danh sách phòng...</div>
              ) : (
                roomTypes.map((room) => {
                  const isSelected = selectedRoomId === room.id
                  return (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 border-2 cursor-pointer ${
                        isSelected ? 'border-[#a43e24] shadow-xl' : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                      }`}
                    >
                      <div className="h-64 relative overflow-hidden">
                        <img className="w-full h-full object-cover" src={room.image} alt={room.name} />
                        {room.isPopular && (
                          <span className="absolute top-4 left-4 bg-[#a43e24] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Phổ biến
                          </span>
                        )}
                      </div>
                      <div className="p-6 text-left flex flex-col justify-between h-56">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-xl font-bold text-[#303330]">{room.name}</h3>
                            <span className="text-[#a43e24] font-black text-lg shrink-0 flex flex-col items-end">
                              <span>{room.pricePerNight.toLocaleString('vi-VN')} đ<span className="text-xs font-normal text-stone-500">/đêm</span></span>
                              {room.dayRate !== undefined && room.dayRate !== null && (
                                <span className="text-xs text-stone-500 font-semibold mt-1">Gửi ngày: {room.dayRate.toLocaleString('vi-VN')} đ</span>
                              )}
                            </span>
                          </div>
                          <span className="inline-block text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full mt-2 mb-3 uppercase tracking-wider">
                            {room.petType}
                          </span>
                          <p className="text-xs text-[#5d605c] leading-relaxed line-clamp-2">{room.description}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRoomId(room.id)
                            setStep(2)
                          }}
                          className="w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all bg-[#a43e24] text-white hover:opacity-90 flex items-center justify-center gap-2"
                        >
                          Chọn Phòng này <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Điều hướng */}
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setStep(2)}
                className="px-8 py-3.5 rounded-full bg-[#a43e24] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5"
              >
                Tiếp tục nhập thông tin <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: THÔNG TIN ── */}
        {showBookingFlow && step === 2 && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-10 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 2: Thông tin đặt phòng</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Chi tiết đặt phòng</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng cung cấp thông tin về thời gian và thú cưng của bạn.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Thời gian lưu trú */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left">
                  <h3 className="text-sm font-bold text-[#303330] mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-[#a43e24]" /> Thời gian gửi
                  </h3>

                  {/* Booking Type Selector */}
                  <div className="mb-6">
                    <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-2">Hình thức gửi</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#faf9f6] rounded-2xl border border-[#e1e3df]">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingType('OVERNIGHT')
                          if (checkOutDate && checkOutDate <= checkInDate) {
                            setCheckOutDate('')
                          }
                        }}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          bookingType === 'OVERNIGHT'
                            ? 'bg-[#a43e24] text-white shadow-md'
                            : 'text-[#8a7e75] hover:text-[#a43e24]'
                        }`}
                      >
                        Lưu trú qua đêm
                      </button>
                      <button
                        type="button"
                        disabled={!activeRoom.dayRate}
                        onClick={() => {
                          if (activeRoom.dayRate) {
                            setBookingType('DAYCARE')
                          }
                        }}
                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                          bookingType === 'DAYCARE'
                            ? 'bg-[#a43e24] text-white shadow-md'
                            : !activeRoom.dayRate
                              ? 'opacity-40 cursor-not-allowed text-stone-400'
                              : 'text-[#8a7e75] hover:text-[#a43e24]'
                        }`}
                      >
                        Gửi ngày (Daycare)
                        {!activeRoom.dayRate && (
                          <span className="block text-[8px] font-bold text-rose-500 normal-case font-normal mt-0.5">
                            Không hỗ trợ
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Ngày nhận phòng</label>
                      <input
                        type="date"
                        value={checkInDate}
                        min={getLocalDateString(new Date())}
                        onChange={e => {
                          setCheckInDate(e.target.value)
                          if (bookingType === 'OVERNIGHT') {
                            if (checkOutDate && checkOutDate <= e.target.value) {
                              setCheckOutDate('')
                            }
                          } else {
                            if (checkOutDate && checkOutDate < e.target.value) {
                              setCheckOutDate('')
                            }
                          }
                        }}
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Ngày trả phòng</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        min={checkInDate
                          ? (bookingType === 'OVERNIGHT'
                            ? getLocalDateString(new Date(new Date(checkInDate).getTime() + 86400000))
                            : checkInDate)
                          : getLocalDateString(new Date(Date.now() + 86400000))}
                        onChange={e => setCheckOutDate(e.target.value)}
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                      />
                    </div>
                  </div>

                  {checkInDate && checkOutDate && bookingType === 'OVERNIGHT' && nights === 0 && (
                    <p className="mt-3 text-xs text-rose-600 font-bold">
                      Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.
                    </p>
                  )}

                  {bookingType === 'DAYCARE' && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#e1e3df]">
                      <div>
                        <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Khung giờ gửi hàng ngày</label>
                        <select
                          value={entryTime}
                          onChange={e => setEntryTime(e.target.value)}
                          className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2.5 text-xs bg-white outline-none font-bold text-[#303330]"
                        >
                          {["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Khung giờ đón hàng ngày</label>
                        <select
                          value={exitTime}
                          onChange={e => setExitTime(e.target.value)}
                          className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2.5 text-xs bg-white outline-none font-bold text-[#303330]"
                        >
                          {["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thông tin thú cưng */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h3 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                    <PawPrint size={18} className="text-[#a43e24]" /> Thông tin thú cưng
                  </h3>

                  {pets.length > 0 && (
                    <div className="flex items-center gap-4">
                      {/* Avatar preview */}
                      <div className="w-14 h-14 rounded-2xl border border-[#e5d8d0] overflow-hidden bg-[#faf9f6] flex-shrink-0 flex items-center justify-center relative shadow-sm">
                        {(() => {
                          const selected = pets.find(p => p.id === selectedPetId);
                          if (selected?.avatarUrl) {
                            return <img src={selected.avatarUrl} alt="Pet avatar" className="w-full h-full object-cover" />;
                          }
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-0.5 bg-[#f5f3ef]/60">
                              <PawPrint size={18} className="text-[#a43e24]/40" />
                              <span className="text-[7px] font-black uppercase tracking-wider bg-[#e5d8d0]/40 px-1 rounded">
                                {selected?.species === 'CAT' ? 'Mèo' : 'Chó'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Chọn từ danh sách của bạn</label>
                        <select 
                          value={selectedPetId}
                          onChange={(e) => setSelectedPetId(e.target.value)}
                          className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs bg-white outline-none font-bold text-[#303330]"
                        >
                          {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Tên thú cưng</label>
                      <input 
                        type="text" 
                        value={petNameInput} 
                        onChange={e => setPetNameInput(e.target.value)}
                        placeholder="VD: Bầu" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Giống loài</label>
                      <input 
                        type="text" 
                        value={petBreedInput} 
                        onChange={e => setPetBreedInput(e.target.value)}
                        placeholder="VD: Golden Retriever" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Tuổi (năm)</label>
                      <input 
                        type="number" 
                        value={petAgeInput} 
                        onChange={e => setPetAgeInput(e.target.value)}
                        placeholder="Tuổi của bé" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Cân nặng (kg)</label>
                      <input 
                        type="number" 
                        value={petWeightInput} 
                        onChange={e => setPetWeightInput(e.target.value)}
                        placeholder="VD: 15" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Yêu cầu đặc biệt</label>
                    <textarea 
                      value={specialRequestInput}
                      onChange={e => setSpecialRequestInput(e.target.value)}
                      placeholder="Chế độ ăn, dị ứng hoặc thói quen đặc biệt..."
                      rows={3}
                      className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-full border border-[#e1e3df] text-xs font-bold text-[#8a7e75] hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!checkInDate || !checkOutDate || (bookingType === 'OVERNIGHT' ? nights < 1 : days < 1)}
                    className="flex-1 py-3.5 rounded-full bg-[#a43e24] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    Tiếp tục <ArrowRight size={14} />
                  </button>
                </div>

              </div>

              {/* Sidebar Tóm tắt */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <div className="h-40 rounded-2xl overflow-hidden">
                    <img className="w-full h-full object-cover" src={activeRoom.image} alt={activeRoom.name} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full uppercase tracking-wider">
                      Phòng đã chọn
                    </span>
                    <h3 className="text-lg font-black mt-2 text-[#303330]">{activeRoom.name}</h3>
                  </div>
                  <div className="space-y-2 border-t border-[#e1e3df] pt-4 text-xs">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>{bookingType === 'DAYCARE' ? 'Giá gửi ngày' : 'Giá mỗi đêm'}</span>
                      <span className="font-bold text-[#303330]">
                        {bookingType === 'DAYCARE'
                          ? `${(activeRoom.dayRate || 0).toLocaleString('vi-VN')}đ`
                          : `${activeRoom.pricePerNight.toLocaleString('vi-VN')}đ`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>{bookingType === 'DAYCARE' ? 'Số ngày' : 'Số đêm'}</span>
                      <span className="font-bold text-[#303330]">
                        {bookingType === 'DAYCARE' ? `${days} ngày` : `${nights} đêm`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#303330] font-black text-sm pt-2 border-t border-dashed border-[#e1e3df]">
                      <span>Tạm tính</span>
                      <span>{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 3: DỊCH VỤ ── */}
        {showBookingFlow && step === 3 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 3: Gói chăm sóc cá nhân hóa</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Dịch Vụ Đặc Quyền</h1>
              <p className="text-sm text-[#5d605c]">
                Nâng tầm trải nghiệm cho thú cưng của bạn với các gói chăm sóc cao cấp.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id)
                  
                  // Helper function inside map to resolve beautiful unsplash fallbacks
                  const getServiceImage = (svc: ExtraService) => {
                    if (svc.imageUrl && (svc.imageUrl.startsWith('http') || svc.imageUrl.startsWith('/')) && !svc.imageUrl.includes('url_anh_')) {
                      return svc.imageUrl
                    }
                    const n = svc.name.toLowerCase()
                    if (n.includes('tắm') || n.includes('spa') || n.includes('thủy liệu')) {
                      return 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600'
                    }
                    if (n.includes('cắt') || n.includes('tỉa') || n.includes('grooming') || n.includes('tạo kiểu')) {
                      return 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&q=80&w=600'
                    }
                    if (n.includes('đưa') || n.includes('đón') || n.includes('vận chuyển') || n.includes('xe')) {
                      return 'https://images.unsplash.com/photo-1533268777956-37790c29994c?auto=format&fit=crop&q=80&w=600'
                    }
                    if (n.includes('ăn') || n.includes('pate') || n.includes('buffet') || n.includes('hạt')) {
                      return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600'
                    }
                    if (n.includes('ve') || n.includes('rận') || n.includes('thuốc') || n.includes('y tế') || n.includes('frontline')) {
                      return 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600'
                    }
                    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600' // General cute dog
                  }

                  const svcImage = getServiceImage(service)

                  return (
                    <div 
                      key={service.id}
                      onClick={() => handleToggleService(service.id)}
                      className={`bg-white rounded-3xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isChecked ? 'border-[#a43e24] shadow-lg' : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                      }`}
                    >
                      <div>
                        {/* Service Image Banner */}
                        <div className="h-44 w-full overflow-hidden relative bg-[#faf9f6] border-b border-[#e1e3df]/60">
                          {svcImage ? (
                            <img 
                              src={svcImage} 
                              alt={service.name} 
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-2 bg-[#fdfcfb]">
                              <div className="w-14 h-14 rounded-2xl bg-[#feeadb]/40 flex items-center justify-center text-[#a43e24] shadow-inner">
                                {service.name.includes('Spa') || service.name.toLowerCase().includes('tắm') ? <Heart size={26} /> :
                                 service.name.toLowerCase().includes('cắt') || service.name.toLowerCase().includes('tỉa') || service.name.toLowerCase().includes('grooming') ? <Scissors size={26} /> :
                                 service.name.toLowerCase().includes('đưa') || service.name.toLowerCase().includes('đón') || service.name.toLowerCase().includes('xe') ? <Car size={26} /> :
                                 service.name.toLowerCase().includes('ăn') || service.name.toLowerCase().includes('pate') || service.name.toLowerCase().includes('buffet') ? <Utensils size={26} /> :
                                 <Sparkles size={26} />}
                              </div>
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <span className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-sm flex items-center justify-center text-[#a43e24] shadow-md">
                              {service.name.includes('Spa') || service.name.toLowerCase().includes('tắm') ? <Heart size={20} /> :
                               service.name.toLowerCase().includes('cắt') || service.name.toLowerCase().includes('tỉa') || service.name.toLowerCase().includes('grooming') ? <Scissors size={20} /> :
                               service.name.toLowerCase().includes('đưa') || service.name.toLowerCase().includes('đón') || service.name.toLowerCase().includes('xe') ? <Car size={20} /> :
                               service.name.toLowerCase().includes('ăn') || service.name.toLowerCase().includes('pate') || service.name.toLowerCase().includes('buffet') ? <Utensils size={20} /> :
                               <Sparkles size={20} />}
                            </span>
                          </div>
                        </div>

                        <div className="p-6 text-left space-y-2">
                          <h4 className="text-lg font-black text-[#303330] line-clamp-1">{service.name}</h4>
                          <p className="text-xs text-[#8a7e75] leading-relaxed line-clamp-2 h-8">{service.desc}</p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-4 flex justify-between items-center border-t border-[#e1e3df]/60">
                        <span className="text-xs font-black text-[#a43e24]">+{service.price.toLocaleString('vi-VN')} đ</span>
                        <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider transition-colors ${
                          isChecked ? 'bg-[#a43e24] text-white' : 'bg-[#faf9f6] text-[#8a7e75] hover:bg-[#a43e24]/10 hover:text-[#a43e24]'
                        }`}>
                          {isChecked ? 'Đã chọn' : 'Thêm dịch vụ'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sidebar Tóm tắt đơn hàng */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tóm tắt đơn hàng</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Tiền phòng</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.map(s => (
                      <div key={s.id} className="flex justify-between text-[#8a7e75]">
                        <span>{s.name}</span>
                        <span className="font-bold text-[#303330]">{s.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thuế VAT (8%)</span>
                      <span className="font-bold text-[#303330]">{vatAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-[#303330] text-sm">Tổng cộng</span>
                    <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')}đ</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10"
                    >
                      Tiếp theo: Xác nhận <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 4: XÁC NHẬN DỊCH VỤ ── */}
        {showBookingFlow && step === 4 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 4: Xác nhận thông tin</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Xác nhận dịch vụ</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng kiểm tra lại thông tin chi tiết của bạn trước khi thanh toán.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Phòng đã chọn card */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left flex gap-6">
                  <div className="w-48 h-32 rounded-2xl overflow-hidden shrink-0">
                    <img className="w-full h-full object-cover" src={activeRoom.image} alt={activeRoom.name} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full uppercase tracking-wider">
                        Phòng đã chọn
                      </span>
                      <h3 className="text-xl font-bold mt-2 text-[#303330]">{activeRoom.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[#8a7e75] block">Ngày nhận</span>
                        <strong className="text-[#303330]">{checkInDate}</strong>
                      </div>
                      <div>
                        <span className="text-[#8a7e75] block">Ngày trả</span>
                        <strong className="text-[#303330]">{checkOutDate}</strong>
                      </div>
                      {bookingType === 'DAYCARE' && (
                        <>
                          <div>
                            <span className="text-[#8a7e75] block">Giờ gửi (hàng ngày)</span>
                            <strong className="text-[#303330]">{entryTime}</strong>
                          </div>
                          <div>
                            <span className="text-[#8a7e75] block">Giờ đón (hàng ngày)</span>
                            <strong className="text-[#303330]">{exitTime}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thông tin thú cưng & Lưu ý */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-3">
                    <h4 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                      <PawPrint size={16} className="text-[#a43e24]" /> Thông tin thú cưng
                    </h4>
                    <div className="flex items-center gap-4">
                      {/* Pet avatar */}
                      <div className="w-14 h-14 rounded-2xl border border-[#e5d8d0] overflow-hidden shrink-0 bg-[#faf9f6] flex items-center justify-center shadow-sm">
                        {(() => {
                          const selected = pets.find(p => p.id === selectedPetId);
                          if (selected?.avatarUrl) {
                            return <img src={selected.avatarUrl} alt="Pet avatar" className="w-full h-full object-cover" />;
                          }
                          return <PawPrint size={20} className="text-[#a43e24]/40" />;
                        })()}
                      </div>
                      <div className="flex-1 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-[#8a7e75]">Tên:</span><strong>{petNameInput}</strong></div>
                        <div className="flex justify-between"><span className="text-[#8a7e75]">Giống loài:</span><strong>{petBreedInput}</strong></div>
                        <div className="flex justify-between"><span className="text-[#8a7e75]">Tuổi:</span><strong>{petAgeInput} tuổi</strong></div>
                        <div className="flex justify-between"><span className="text-[#8a7e75]">Cân nặng:</span><strong>{petWeightInput} kg</strong></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-3">
                    <h4 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                      <Bookmark size={16} className="text-[#a43e24]" /> Lưu ý đặc biệt
                    </h4>
                    <p className="text-xs text-[#5d605c] italic leading-relaxed">
                      {specialRequestInput || "Không có yêu cầu đặc biệt."}
                    </p>
                  </div>
                </div>

                {/* Danh sách dịch vụ bổ sung */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h4 className="text-sm font-bold text-[#303330]">Dịch vụ bổ sung đã chọn</h4>
                  {selectedServicesList.length === 0 ? (
                    <p className="text-xs text-[#8a7e75]">Không chọn dịch vụ đi kèm nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedServicesList.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 bg-[#faf9f6] rounded-xl text-xs">
                          <span className="font-bold text-[#303330]">{s.name}</span>
                          <span className="font-black text-[#a43e24]">{s.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Sidebar Tổng kết chi phí */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tổng kết chi phí</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Tiền phòng ({bookingType === 'DAYCARE' ? `${days} ngày` : `${nights} đêm`})</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.length > 0 && (
                      <div className="flex justify-between text-[#8a7e75]">
                        <span>Tiền dịch vụ</span>
                        <span className="font-bold text-[#303330]">{servicesCost.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thuế VAT (8%)</span>
                      <span className="font-bold text-[#303330]">{vatAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-[#303330] text-sm">Tổng cộng</span>
                    <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')}đ</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={() => setStep(5)}
                      className="w-full bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10"
                    >
                      Tiến tới thanh toán <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 5: THANH TOÁN ── */}
        {showBookingFlow && step === 5 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 5: Thanh Toán</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Hoàn tất thủ tục đặt phòng</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng lựa chọn phương thức và quét mã chuyển khoản để hoàn tất.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Chọn phương thức thanh toán */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h3 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#a43e24]" /> Phương thức thanh toán
                  </h3>
                  <div className="p-4 bg-[#feeadb]/20 border-2 border-[#a43e24] rounded-2xl flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#303330]">Chuyển khoản VietQR (qua payOS)</p>
                      <p className="text-[10px] text-[#8a7e75] mt-0.5">Quét mã QR tự động bằng App Ngân hàng bất kỳ.</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 border-[#a43e24] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#a43e24]" />
                    </div>
                  </div>
                </div>

                {/* Hướng dẫn chuyển khoản payOS */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-center space-y-4">
                  <div className="w-16 h-16 bg-[#feeadb] text-[#a43e24] rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck size={32} />
                  </div>
                  <h4 className="text-base font-black text-[#303330]">Cổng thanh toán an toàn payOS</h4>
                  <p className="text-xs text-[#8a7e75] max-w-md mx-auto leading-relaxed">
                    Sau khi nhấn <strong>"Thanh Toán Ngay"</strong>, hệ thống sẽ tự động tạo một mã giao dịch duy nhất và chuyển hướng bạn sang trang thanh toán bảo mật của <strong>payOS</strong> để quét mã VietQR.
                  </p>
                </div>

              </div>

              {/* Sidebar Tóm tắt hóa đơn cuối */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tóm tắt đơn hàng</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Loại phòng</span>
                      <strong className="text-[#303330]">{activeRoom.name}</strong>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thời gian</span>
                      <strong className="text-[#303330]">{bookingType === 'DAYCARE' ? `${days} ngày` : `${nights} đêm`} | 1 thú cưng</strong>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Tiền phòng</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.length > 0 && (
                      <div className="flex justify-between text-[#8a7e75]">
                        <span>Tiền dịch vụ</span>
                        <span className="font-bold text-[#303330]">{servicesCost.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thuế VAT (8%)</span>
                      <span className="font-bold text-[#303330]">{vatAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {/* Nhập mã giảm giá */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-[#8a7e75] mb-2 uppercase">Mã giảm giá</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập mã (SANCTUARY20)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-grow rounded-xl border border-[#e1e3df] px-4 py-2 text-xs outline-none"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-[#2c4e24] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shrink-0"
                      >
                        Áp dụng
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={`text-[10px] font-bold mt-2 ${discountPercent > 0 ? 'text-[#44683b]' : 'text-[#a43e24]'}`}>
                        {couponMessage}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs border-t border-[#e1e3df] pt-4">
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-[#44683b] font-bold">
                        <span>Giảm giá voucher ({discountPercent}%)</span>
                        <span>-{voucherDiscountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-[#303330] text-sm">Tổng thanh toán</span>
                      <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={handleCreateBooking}
                      disabled={bookingLoading}
                      className="w-full bg-[#a43e24] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10 disabled:opacity-50"
                    >
                      {bookingLoading ? 'Đang tạo lịch...' : 'Thanh Toán Ngay'} <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDIT DESCRIPTION */}
      {isEditDescOpen && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-[#e1e3df] text-left space-y-6 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-xl font-black text-[#303330]">Chỉnh sửa mô tả khách sạn</h3>
              <p className="text-xs text-[#8a7e75] mt-1">Cập nhật thông tin giới thiệu chung về khách sạn của bạn.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-[#8a7e75] font-bold uppercase">Nội dung giới thiệu</label>
              <textarea
                value={editDescriptionText}
                onChange={(e) => setEditDescriptionText(e.target.value)}
                placeholder="Nhập thông tin giới thiệu..."
                rows={8}
                className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-xs outline-none focus:border-[#a43e24] resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[#8a7e75] font-bold uppercase block">Tiện ích / Tiện nghi bổ sung</label>
              <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 rounded-2xl border border-[#e1e3df] text-xs">
                {[
                  { id: 'Private Garden', label: 'Sân vườn riêng' },
                  { id: 'Điều hòa (AC)', label: 'Điều hòa nhiệt độ' },
                  { id: 'Camera 24/7', label: 'Camera 24/7' }
                ].map(item => {
                  const isChecked = editAmenities.includes(item.id)
                  return (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer font-bold text-[#5d605c] hover:text-[#303330] transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setEditAmenities(editAmenities.filter(a => a !== item.id))
                          } else {
                            setEditAmenities([...editAmenities, item.id])
                          }
                        }}
                        className="rounded text-[#a43e24] focus:ring-0"
                      />
                      <span>{item.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditDescOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#e1e3df] text-xs font-bold text-[#8a7e75] hover:bg-stone-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleUpdateHotelDetail(editDescriptionText, logoUrl || '', frontUrls, roomsUrls, imageUrls, editAmenities)}
                className="px-6 py-2.5 rounded-full bg-[#a43e24] text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT IMAGES */}
      {isEditImagesOpen && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e1e3df] text-left space-y-6 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-xl font-black text-[#303330]">Chỉnh sửa hình ảnh</h3>
              <p className="text-xs text-[#8a7e75] mt-1">Cập nhật ảnh logo, ảnh mặt tiền và cơ sở vật chất của khách sạn.</p>
            </div>

            <div className="space-y-5">
              {/* Logo Upload */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] text-[#8a7e75] font-bold uppercase block">Logo Khách sạn</label>
                <div className="flex items-center gap-4">
                  <label className="relative w-20 h-20 rounded-full border-2 border-dashed border-stone-200 overflow-hidden cursor-pointer group bg-stone-50 flex flex-col items-center justify-center hover:border-[#a43e24]/50 transition-all shrink-0">
                    {editLogoUrl ? (
                      <>
                        <img src={editLogoUrl} className="w-full h-full object-cover" alt="Preview Logo" />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Upload size={14} />
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <Upload className="text-stone-400 mx-auto" size={16} />
                        <span className="text-[8px] text-[#8a7e75] block mt-0.5">Tải logo</span>
                      </div>
                    )}
                    {uploadingField === 'logo' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#a43e24]" size={16} />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                  </label>
                  
                  <div>
                    <p className="text-xs font-bold text-[#303330]">Bấm vào vòng tròn ảnh để tải logo mới</p>
                    <p className="text-[10px] text-[#8a7e75] mt-0.5 italic">Khuyên dùng ảnh hình tròn hoặc hình vuông tỉ lệ 1:1.</p>
                  </div>
                </div>
              </div>

              {/* Front Image Upload (Array Grid) */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] text-[#8a7e75] font-bold uppercase block">Ảnh Mặt Tiền (Slider chính)</label>
                  <span className="text-[9px] text-[#8a7e75] italic">({editFrontUrls.length} ảnh)</span>
                </div>
                
                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {editFrontUrls.map((url, idx) => (
                    <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100 group">
                      <img src={url} className="w-full h-full object-cover" alt={`Front ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => setEditFrontUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer animate-in fade-in duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Plus Card for Uploading */}
                  <label className="relative w-full aspect-video rounded-xl border-2 border-dashed border-stone-200 cursor-pointer hover:border-[#a43e24]/50 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100/50 transition-all">
                    <Plus className="text-stone-400" size={18} />
                    <span className="text-[9px] text-[#8a7e75] font-bold mt-1">Thêm ảnh</span>
                    {uploadingField === 'front' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#a43e24]" size={14} />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'front')} />
                  </label>
                </div>
              </div>

              {/* Rooms Image Upload (Array Grid) */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] text-[#8a7e75] font-bold uppercase block">Ảnh Phòng/Cơ Sở Vật Chất chính</label>
                  <span className="text-[9px] text-[#8a7e75] italic">({editRoomsUrls.length} ảnh)</span>
                </div>
                
                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {editRoomsUrls.map((url, idx) => (
                    <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100 group">
                      <img src={url} className="w-full h-full object-cover" alt={`Rooms ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => setEditRoomsUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer animate-in fade-in duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Plus Card for Uploading */}
                  <label className="relative w-full aspect-video rounded-xl border-2 border-dashed border-stone-200 cursor-pointer hover:border-[#a43e24]/50 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100/50 transition-all">
                    <Plus className="text-stone-400" size={18} />
                    <span className="text-[9px] text-[#8a7e75] font-bold mt-1">Thêm ảnh</span>
                    {uploadingField === 'rooms' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#a43e24]" size={14} />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'rooms')} />
                  </label>
                </div>
              </div>

              {/* Album Image Upload */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] text-[#8a7e75] font-bold uppercase block">Album Ảnh Chi Tiết Bổ Sung</label>
                  <span className="text-[9px] text-[#8a7e75] italic">({editImageUrls.length} ảnh)</span>
                </div>
                
                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {editImageUrls.map((url, idx) => (
                    <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-200 bg-stone-100 group">
                      <img src={url} className="w-full h-full object-cover" alt={`Album ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => setEditImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer animate-in fade-in duration-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Plus Card for Uploading */}
                  <label className="relative w-full aspect-video rounded-xl border-2 border-dashed border-stone-200 cursor-pointer hover:border-[#a43e24]/50 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100/50 transition-all">
                    <Plus className="text-stone-400" size={18} />
                    <span className="text-[9px] text-[#8a7e75] font-bold mt-1">Thêm ảnh</span>
                    {uploadingField === 'album' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#a43e24]" size={14} />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'album')} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsEditImagesOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#e1e3df] text-xs font-bold text-[#8a7e75] hover:bg-stone-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => {
                  handleUpdateHotelDetail(hotelDescriptionText || '', editLogoUrl, editFrontUrls, editRoomsUrls, editImageUrls, amenities)
                }}
                className="px-6 py-2.5 rounded-full bg-[#a43e24] text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-0 z-[9999] bg-[#303330]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl border border-[#e1e3df] animate-in fade-in zoom-in-95 duration-300">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              toast.type === 'success' ? 'bg-[#d0fac0] text-[#44683b]' :
              toast.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
              'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={32} /> :
               toast.type === 'error' ? <AlertCircle size={32} /> :
               <AlertTriangle size={32} />}
            </div>
            
            <h3 className="text-xl font-black text-[#303330] mb-2">
              {toast.type === 'success' ? 'Thành công!' :
               toast.type === 'error' ? 'Thông báo lỗi' :
               'Lưu ý'}
            </h3>
            
            <p className="text-xs text-[#5d605c] leading-relaxed mb-6 font-semibold">
              {toast.message}
            </p>
            
            <button
              onClick={() => setToast(null)}
              className={`w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider text-white transition-all shadow-md cursor-pointer ${
                toast.type === 'success' ? 'bg-[#44683b] shadow-[#44683b]/20 hover:opacity-95' :
                toast.type === 'error' ? 'bg-[#a43e24] shadow-[#a43e24]/20 hover:opacity-95' :
                'bg-[#fa7150] shadow-[#fa7150]/20 hover:opacity-95'
              }`}
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT MODAL ── */}
      {showReportModal && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-left border border-[#e5d8d0] animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-[#303330] mb-2 flex items-center gap-2">
              <Flag size={20} className="text-rose-500" /> Báo cáo Khách sạn
            </h3>
            <p className="text-xs text-[#8a7e75] mb-6">
              Bạn có thể báo cáo khách sạn nếu thấy có dấu hiệu lừa đảo, ngược đãi thú cưng hoặc thông tin sai lệch. Góp ý của bạn sẽ giúp hệ thống minh bạch hơn.
            </p>
            
            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#8a7e75] mb-2 uppercase">Lý do báo cáo *</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full p-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150]"
                >
                  <option value="Lừa đảo">Lừa đảo / Giả mạo</option>
                  <option value="Thông tin sai lệch">Thông tin dịch vụ sai lệch</option>
                  <option value="Vệ sinh kém">Cơ sở vật chất / Vệ sinh kém</option>
                  <option value="Ngược đãi thú cưng">Ngược đãi thú cưng</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8a7e75] mb-2 uppercase">Mô tả chi tiết *</label>
                <textarea
                  rows={4}
                  required
                  value={reportDetail}
                  onChange={e => setReportDetail(e.target.value)}
                  placeholder="Mô tả cụ thể hành vi vi phạm hoặc lừa đảo của khách sạn..."
                  className="w-full p-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#8a7e75] mb-2 uppercase">Ảnh bằng chứng (Tối đa 3 ảnh)</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {reportImages.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#e5d8d0] group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveReportImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-800 transition-colors shadow-md flex items-center justify-center cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  
                  {reportImages.length < 3 && (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-[#e5d8d0] bg-[#faf9f6] hover:bg-[#fa7150]/5 hover:border-[#fa7150]/40 flex flex-col items-center justify-center text-[#8a7e75] cursor-pointer transition-colors relative">
                      {uploadingField === 'reportImages' ? (
                        <span className="w-4 h-4 border-2 border-[#fa7150]/20 border-t-[#fa7150] rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload size={16} className="text-[#fa7150]" />
                          <span className="text-[8px] font-bold block mt-1">Tải ảnh</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingField === 'reportImages'}
                        onChange={handleReportImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || uploadingField === 'reportImages'}
                  className="flex-1 py-3 rounded-2xl bg-[#fa7150] hover:bg-[#a43e24] text-white text-sm font-bold transition-colors text-center cursor-pointer disabled:opacity-50"
                >
                  {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
