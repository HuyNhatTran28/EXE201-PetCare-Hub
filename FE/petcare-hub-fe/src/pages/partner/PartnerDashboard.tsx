import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  PawPrint, Calendar, Star,
  Settings, PlusCircle, LogOut, MapPin, ListOrdered,
  ChevronRight, TrendingUp, Building, BarChart2,
  Clock, Mail, MessageSquare, Save, Edit, Camera, Sparkles, QrCode, FileText, Download, Printer, ShieldAlert, Upload, Trash2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'

interface HotelType {
  id: string
  name: string
  address: string
  status: string
  averageRating: number
  imageUrls?: string[]
}

export const PartnerDashboard = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'hotels'
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // get Monday
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const getWeekDates = (mondayDate: Date) => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate)
      d.setDate(mondayDate.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const handlePrevWeek = () => {
    setSelectedWeekStart(prev => {
      const newD = new Date(prev)
      newD.setDate(prev.getDate() - 7)
      return newD
    })
  }

  const handleNextWeek = () => {
    setSelectedWeekStart(prev => {
      const newD = new Date(prev)
      newD.setDate(prev.getDate() + 7)
      return newD
    })
  }

  const handleCurrentWeek = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setSelectedWeekStart(monday)
  }

  const formatDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getPetAvatar = (species?: string) => {
    const s = species?.toLowerCase() || ''
    if (s.includes('cat') || s.includes('mèo')) {
      return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=60'
    }
    if (s.includes('dog') || s.includes('chó')) {
      return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=60'
    }
    return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=60'
  }

  const [stats, setStats] = useState({
    todayBookings: 0,
    monthlyRevenue: 0,
    activeGuests: 0,
    rating: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'hotels' | 'analytics' | 'bookings' | 'paperless' | 'settings'>(initialTab)

  // Đăng ký khách sạn mới qua API thật
  const [showAddHotelModal, setShowAddHotelModal] = useState(false)
  const [wizardStep, setWizardStep] = useState(1) // 1 to 3
  
  // Step 1: Store Profile
  const [newHotelName, setNewHotelName] = useState('')
  const [hotelProvince, setHotelProvince] = useState('Thành phố Hồ Chí Minh')
  const [hotelDistrict, setHotelDistrict] = useState('')
  const [hotelWard, setHotelWard] = useState('')
  const [hotelStreet, setHotelStreet] = useState('')
  
  const [serviceBoarding, setServiceBoarding] = useState(true)
  const [serviceGrooming, setServiceGrooming] = useState(false)
  const [serviceVet, setServiceVet] = useState(false)
  const [serviceShop, setServiceShop] = useState(false)
  const [serviceOther, setServiceOther] = useState(false)
  
  const [petTarget, setPetTarget] = useState<'DOG_ONLY' | 'CAT_ONLY' | 'BOTH'>('BOTH')
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('20:00')
  
  const [logoUrl, setLogoUrl] = useState('')
  const [frontUrl, setFrontUrl] = useState('')
  const [roomsUrl, setRoomsUrl] = useState('')
  
  // Step 2: KYC documents
  const [cccdNumber, setCccdNumber] = useState('')
  const [cccdFrontUrl, setCccdFrontUrl] = useState('')
  const [cccdBackUrl, setCccdBackUrl] = useState('')
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('')
  const [vetCertUrl, setVetCertUrl] = useState('')
  
  // Raw files for eKYC API
  const [cccdFrontFile, setCccdFrontFile] = useState<File | null>(null)
  const [cccdBackFile, setCccdBackFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [selfieUrl, setSelfieUrl] = useState('')
  
  // eKYC verification states
  const [isKycVerified, setIsKycVerified] = useState(false)
  const [kycVerifying, setKycVerifying] = useState(false)
  const [kycError, setKycError] = useState('')

  // Webcam states
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)

  // Step 3: Bank Account
  const [bankName, setBankName] = useState('Techcombank')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')

  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [isAddingHotel, setIsAddingHotel] = useState(false)

  const validateImageFile = (file: File): { isValid: boolean; message: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Chỉ chấp nhận các tệp ảnh .jpg, .jpeg, .png.`
      };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPEG hoặc PNG.`
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

  const validateDocumentFile = (file: File): { isValid: boolean; message: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        message: `Định dạng tài liệu "${file.name}" không hợp lệ. Chỉ chấp nhận định dạng ảnh (.jpg, .jpeg, .png) hoặc tài liệu PDF (.pdf).`
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: `Kích thước tài liệu "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn tệp dưới 10MB.`
      };
    }

    return { isValid: true, message: '' };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file before uploading
    if (['logo', 'front', 'rooms', 'cccdFront', 'cccdBack', 'selfie'].includes(fieldKey)) {
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.message);
        e.target.value = ''; // Reset file input
        return;
      }
    } else if (['businessLicense', 'vetCert'].includes(fieldKey)) {
      const validation = validateDocumentFile(file);
      if (!validation.isValid) {
        alert(validation.message);
        e.target.value = ''; // Reset file input
        return;
      }
    }

    // Save raw files for backend eKYC verification
    if (fieldKey === 'cccdFront') setCccdFrontFile(file)
    if (fieldKey === 'cccdBack') setCccdBackFile(file)
    if (fieldKey === 'selfie') setSelfieFile(file)

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
      
      switch (fieldKey) {
        case 'logo': setLogoUrl(url); break;
        case 'front': setFrontUrl(url); break;
        case 'rooms': setRoomsUrl(url); break;
        case 'cccdFront': setCccdFrontUrl(url); break;
        case 'cccdBack': setCccdBackUrl(url); break;
        case 'selfie': setSelfieUrl(url); break;
        case 'businessLicense': setBusinessLicenseUrl(url); break;
        case 'vetCert': setVetCertUrl(url); break;
        default: break;
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Không thể tải ảnh lên. Vui lòng thử lại.')
    } finally {
      setUploadingField(null)
    }
  }

  const handleVerifyKyc = async () => {
    if (!cccdFrontFile || !cccdBackFile || !selfieFile) {
      alert('Vui lòng chọn đầy đủ 3 ảnh (Mặt trước CCCD, Mặt sau CCCD và Ảnh chân dung Selfie) để xác thực!')
      return
    }

    // Double check files validation at submission
    const frontVal = validateImageFile(cccdFrontFile);
    if (!frontVal.isValid) {
      alert('Ảnh mặt trước CCCD không hợp lệ: ' + frontVal.message);
      return;
    }
    const backVal = validateImageFile(cccdBackFile);
    if (!backVal.isValid) {
      alert('Ảnh mặt sau CCCD không hợp lệ: ' + backVal.message);
      return;
    }
    const selfieVal = validateImageFile(selfieFile);
    if (!selfieVal.isValid) {
      alert('Ảnh chân dung Selfie không hợp lệ: ' + selfieVal.message);
      return;
    }

    setKycVerifying(true)
    setKycError('')
    const formData = new FormData()
    formData.append('frontImage', cccdFrontFile)
    formData.append('backImage', cccdBackFile)
    formData.append('selfieImage', selfieFile)

    try {
      const res = await axiosInstance.post('/api/merchant/kyc/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000 // Tăng timeout lên 120s cho quy trình xác thực eKYC gọi nhiều API VNPT
      })

      if (res.data.success) {
        setIsKycVerified(true)
        setCccdNumber(res.data.cccdNumber || '')
        setBankAccountName(res.data.fullName || '') // Tự động điền họ tên chủ tài khoản thụ hưởng
        alert(res.data.message || 'Xác thực danh tính chủ cửa hàng (eKYC) thành công!')
      } else {
        setIsKycVerified(false)
        setKycError(res.data.message || 'Xác thực thất bại.')
        alert('Xác thực thất bại: ' + (res.data.message || 'Thông tin khuôn mặt không khớp.'))
      }
    } catch (err: any) {
      console.error('KYC verification error', err)
      let msg = err.response?.data?.message
      if (!msg) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          msg = 'Yêu cầu xác thực eKYC quá thời gian phản hồi (timeout). Vui lòng thử lại!'
        } else {
          msg = err.message || 'Có lỗi kết nối xảy ra với máy chủ xác thực eKYC.'
        }
      }
      setKycError(msg)
      alert('Lỗi kết nối eKYC: ' + msg)
    } finally {
      setKycVerifying(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      setCameraStream(stream)
      setShowCameraModal(true)
      
      // Đợi video render rồi gán stream
      setTimeout(() => {
        const video = document.getElementById('webcam-video') as HTMLVideoElement
        if (video) {
          video.srcObject = stream
          video.play().catch(err => console.error("Error playing video:", err))
        }
      }, 100)
    } catch (err) {
      console.error('Không thể mở camera:', err)
      alert('Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị của trình duyệt.')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
  }

  const capturePhoto = () => {
    const video = document.getElementById('webcam-video') as HTMLVideoElement
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Flip horizontal để có hiệu ứng gương (mirror) tự nhiên
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'selfie.png', { type: 'image/png' })
        setSelfieFile(file)

        // Tải ảnh chụp lên Cloudinary hiển thị preview
        setUploadingField('selfie')
        const formData = new FormData()
        formData.append('file', file)
        try {
          const res = await axiosInstance.post('/api/upload/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          setSelfieUrl(res.data.url)
        } catch (err) {
          console.error('Lỗi khi lưu ảnh selfie chụp:', err)
          alert('Không thể tải ảnh chụp lên hệ thống. Vui lòng thử lại.')
        } finally {
          setUploadingField(null)
        }
      }, 'image/png')
    }
    stopCamera()
  }

  const handleAddHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHotelName.trim()) {
      alert('Vui lòng điền Tên cửa hàng ở Bước 1.')
      return
    }
    if (!hotelStreet.trim() || !hotelDistrict.trim()) {
      alert('Vui lòng điền Quận/Huyện và Số nhà, tên đường ở Bước 1.')
      return
    }

    setIsAddingHotel(true)
    try {
      const fullAddress = `${hotelStreet}, Phường/Xã ${hotelWard || '—'}, Quận/Huyện ${hotelDistrict}, ${hotelProvince}`
      
      // Compile selected services
      const selectedServices: string[] = []
      if (serviceBoarding) selectedServices.push('Pet Boarding')
      if (serviceGrooming) selectedServices.push('Grooming & Spa')
      if (serviceVet) selectedServices.push('Veterinary')
      if (serviceShop) selectedServices.push('Pet Shop')
      if (serviceOther) selectedServices.push('Other Services')

      // Compile description JSON containing KYC and Bank info
      const extraInfo = {
        petTarget,
        logoUrl,
        frontUrl,
        roomsUrl,
        cccd: {
          number: cccdNumber,
          frontUrl: cccdFrontUrl,
          backUrl: cccdBackUrl
        },
        legal: {
          businessLicenseUrl,
          vetCertUrl
        },
        banking: {
          bankName,
          accountNumber: bankAccountNumber,
          accountName: bankAccountName
        }
      }

      const payload = {
        name: newHotelName,
        address: fullAddress,
        locationLat: 10.7769,
        locationLong: 106.7009,
        description: JSON.stringify(extraInfo),
        amenities: selectedServices,
        checkInTime: openTime,
        checkOutTime: closeTime
      }

      await axiosInstance.post('/api/hotels', payload)
      alert('Gửi hồ sơ đăng ký và thông tin xác thực (KYC) thành công! Vui lòng chờ Admin phê duyệt.')
      
      // Reset state
      setNewHotelName('')
      setHotelStreet('')
      setHotelWard('')
      setHotelDistrict('')
      setHotelProvince('Thành phố Hồ Chí Minh')
      setLogoUrl('')
      setFrontUrl('')
      setRoomsUrl('')
      setCccdNumber('')
      setCccdFrontUrl('')
      setCccdBackUrl('')
      setBusinessLicenseUrl('')
      setVetCertUrl('')
      setBankAccountNumber('')
      setBankAccountName('')
      setShowAddHotelModal(false)
      setWizardStep(1)
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to create hotel', error)
      alert(error.response?.data?.message || 'Không thể đăng ký. Vui lòng thử lại.')
    } finally {
      setIsAddingHotel(false)
    }
  }

  const handleToggleHotelStatus = async (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId)
    if (!hotel) return

    const isActive = hotel.status === 'ACTIVE'
    const confirmMessage = isActive
      ? `Bạn có chắc chắn muốn TẠM NGƯNG hoạt động của khách sạn "${hotel.name}" không? Khách sạn sẽ không xuất hiện trong kết quả tìm kiếm của khách hàng.`
      : `Bạn có chắc chắn muốn KÍCH HOẠT lại hoạt động của khách sạn "${hotel.name}" không?`

    if (!window.confirm(confirmMessage)) return

    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/status/toggle`)
      alert(isActive ? 'Tạm ngưng hoạt động khách sạn thành công!' : 'Kích hoạt lại hoạt động khách sạn thành công!')
      window.location.reload()
    } catch (err: any) {
      console.error('Failed to toggle hotel status', err)
      alert(err.response?.data?.message || 'Không thể thay đổi trạng thái khách sạn. Vui lòng thử lại.')
    }
  }

  // CRM state
  const [selectedPet, setSelectedPet] = useState<any>({
    name: 'Rocky',
    breed: 'Golden Retriever',
    age: '3 Tuổi',
    status: 'Đang lưu trú',
    behavior: 'Hay gặm nhẹ - Khi gặp người lạ hoặc lúc ăn. Cần tiếp cận chậm rãi.',
    diet: 'Hạt mềm - Không ăn được xương cứng, thích hạt trộn pate gà.',
    health: 'Sức khỏe - Dị ứng xà phòng mùi mạnh. Sử dụng loại thảo mộc.',
    img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=150'
  })

  // Paperless state
  const [checkInPetName, setCheckInPetName] = useState('Mochi - Golden Retriever')
  const [checkInHealth, setCheckInHealth] = useState('Khỏe mạnh, hơi nhát người lạ.')
  const [promoCode, setPromoCode] = useState('')
  const [usePoints, setUsePoints] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [showQrPay, setShowQrPay] = useState(false)

  // Settings State
  const [channels, setChannels] = useState({
    email: true,
    sms: true,
    zalo: false
  })
  const [generalSettings, setGeneralSettings] = useState({
    currency: 'VND',
    timezone: 'Bangkok',
    cooldown: 45
  })
  const [emailTemplate, setEmailTemplate] = useState('Chào {{owner_name}},\n\nChúng tôi rất háo hức được chào đón {{pet_name}} đến với PetCare Hub vào ngày {{check_in_date}}!')
  const [pointRule, setPointRule] = useState('10,000 VNĐ = 1 Điểm')
  const [settingsSubTab, setSettingsSubTab] = useState<'channels' | 'loyalty' | 'general'>('channels')

  // Interactive Booking State
  const [bookingFilter, setBookingFilter] = useState('ALL')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hotelRes = await axiosInstance.get('/api/hotels/my', {
          params: { page: 0, size: 20, sort: [] }
        })
        const hotelList = hotelRes.data.content || []
        setHotels(hotelList)
        if (hotelList.length > 0) {
          setSelectedHotelId(prev => prev || hotelList[0].id)
        }

        if (hotelList.length > 0) {
          const avgRating = hotelList.reduce(
            (sum: number, h: any) => sum + (h.averageRating || 0), 0
          ) / hotelList.length

          // Fetch bookings across all partner hotels
          let allBookings: any[] = []
          for (const hotel of hotelList) {
            try {
              const bookingRes = await axiosInstance.get(
                `/api/bookings/hotel/${hotel.id}`,
                { params: { page: 0, size: 100, sort: [] } }
              )
              allBookings.push(...(bookingRes.data.content || []))
            } catch (err) {
              console.error(`Failed to fetch bookings for hotel ${hotel.id}`, err)
            }
          }

          const today = new Date().toISOString().split('T')[0]
          const todayBookings = allBookings.filter((b: any) =>
            b.createdAt?.startsWith(today)
          ).length

          const activeGuests = allBookings.filter((b: any) =>
            b.status === 'CHECKED_IN'
          ).length

          const monthlyRevenue = allBookings
            .filter((b: any) => b.status === 'COMPLETED' || b.status === 'CHECKED_IN')
            .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)

          setStats({
            todayBookings,
            activeGuests,
            monthlyRevenue,
            rating: Math.round(avgRating * 10) / 10
          })
        } else {
          setStats({
            todayBookings: 0,
            monthlyRevenue: 0,
            activeGuests: 0,
            rating: 0
          })
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!selectedHotelId) return
      setCalendarLoading(true)
      try {
        const [rtRes, bRes] = await Promise.all([
          axiosInstance.get(`/api/room-types/hotel/${selectedHotelId}`),
          axiosInstance.get(`/api/bookings/hotel/${selectedHotelId}`, {
            params: { page: 0, size: 150, sort: [] }
          })
        ])
        setRoomTypes(rtRes.data || [])
        setBookings(bRes.data.content || [])
      } catch (err) {
        console.error('Failed to load hotel calendar data', err)
      } finally {
        setCalendarLoading(false)
      }
    }

    if (activeTab === 'bookings') {
      fetchCalendarData()
    }
  }, [selectedHotelId, activeTab])

  // const [selectedCheckInBookingId, setSelectedCheckInBookingId] = useState<string>('')
  // const [selectedCheckOutBookingId, setSelectedCheckOutBookingId] = useState<string>('')

  // const handleRealCheckIn = async () => {
  //   const targetId = selectedCheckInBookingId
  //   if (!targetId) {
  //     alert('Vui lòng chọn một đặt phòng để làm thủ tục check-in.')
  //     return
  //   }
  //   try {
  //     await axiosInstance.patch(`/api/bookings/${targetId}/checkin`, null, {
  //       params: {
  //         checkinPhotoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
  //         ownerSignatureUrl: 'https://example.com/signature.png'
  //       }
  //     })
  //     alert('Check-in thành công!')
  //     window.location.reload()
  //   } catch (err: any) {
  //     alert(err.response?.data?.message || 'Check-in thất bại.')
  //   }
  // }

  // const handleRealCheckOut = async () => {
  //   const targetId = selectedCheckOutBookingId
  //   if (!targetId) {
  //     alert('Vui lòng chọn một đặt phòng để làm thủ tục check-out.')
  //     return
  //   }
  //   try {
  //     await axiosInstance.patch(`/api/bookings/${targetId}/checkout`)
  //     alert('Thanh toán và Check-out thành công!')
  //     window.location.reload()
  //   } catch (err: any) {
  //     alert(err.response?.data?.message || 'Check-out thất bại.')
  //   }
  // }

  // Premium design tokens
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }
  const greenGradient = { background: 'linear-gradient(135deg, #44683b 0%, #2c4e24 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col md:flex-row">

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-full md:w-80 bg-white border-r border-[#e5d8d0] flex flex-col justify-between p-6 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        <div className="space-y-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={orangeGradient}>
              <PawPrint size={22} />
            </div>
            <div className="text-left">
              <span className="text-lg font-black tracking-tight block">PetCare Hub</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">RESORT CONSOLE</span>
            </div>
          </Link>

          {/* User Brief */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl flex items-center gap-3 border border-[#e5d8d0]/60">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#e5d8d0] text-sm font-black text-[#fa7150]">
              {user?.fullName?.charAt(0) || 'P'}
            </div>
            <div className="text-left overflow-hidden">
              <span className="text-sm font-bold text-[#303330] block truncate">{user?.fullName || 'Đối tác'}</span>
              <span className="text-[10px] font-semibold text-[#8a7e75] block truncate">{user?.email || 'partner@gmail.com'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('hotels')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'hotels'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Building size={18} /> Quản Lý Khách Sạn
              </span>
              <ChevronRight size={14} className={activeTab === 'hotels' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'bookings'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} /> Đặt Chỗ & Lịch Trình
              </span>
              <ChevronRight size={14} className={activeTab === 'bookings' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('paperless')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'paperless'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Sparkles size={18} /> Quy trình Không giấy tờ
              </span>
              <ChevronRight size={14} className={activeTab === 'paperless' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart2 size={18} /> Phân Tích & CRM
              </span>
              <ChevronRight size={14} className={activeTab === 'analytics' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Settings size={18} /> Cài Đặt Hệ Thống
              </span>
              <ChevronRight size={14} className={activeTab === 'settings' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <div className="h-px bg-[#e5d8d0]/60 my-2" />

            <Link
              to="/partner/bookings"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330] transition-all"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} /> Danh sách Bookings
              </span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
            </Link>
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-[#e5d8d0]/60 mt-10 md:mt-0">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full py-3 px-4 rounded-2xl border border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut size={16} /> Đăng xuất đối tác
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Greeting Banner */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fa7150] animate-ping"></span>
              <span className="text-[#fa7150] text-xs font-black tracking-widest uppercase">PetCare Hub Partner Center</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#303330]">
              {activeTab === 'bookings' ? 'Lịch Đặt phòng Tương tác' :
               activeTab === 'paperless' ? 'Quy trình Không giấy tờ' :
               activeTab === 'analytics' ? 'Phân tích & CRM' :
               activeTab === 'settings' ? 'Cấu hình Hệ thống' :
               `Chào buổi sáng, ${user?.fullName || 'Đối tác'}! 🐾`}
            </h1>
            <p className="text-[#8a7e75] text-sm max-w-xl">
              {activeTab === 'bookings' ? 'Quản lý trạng thái phòng nghỉ và lịch trình đón thú cưng trong tuần này.' :
               activeTab === 'paperless' ? 'Quản lý tiếp nhận check-in và thanh toán bàn giao check-out thú cưng chuyên nghiệp.' :
               activeTab === 'analytics' ? 'Tổng quan hoạt động kinh doanh, doanh số và quản lý thông tin hồ sơ khách hàng.' :
               activeTab === 'settings' ? 'Cài đặt truyền thông, chương trình khách hàng thân thiết và quy tắc hệ thống.' :
               'Hôm nay là một ngày tuyệt vời để quản lý các thiên đường nghỉ dưỡng thú cưng của bạn.'}
            </p>
          </div>

          {/* Quick Registration Button */}
          <button
            onClick={() => setShowAddHotelModal(true)}
            style={orangeGradient}
            className="px-6 py-3.5 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer w-fit self-start lg:self-center"
          >
            <PlusCircle size={16} /> Đăng ký thêm cơ sở mới
          </button>
        </header>

        {/* ── TAB 1: RESORT LIST SECTION ── */}
        {activeTab === 'hotels' && (
          <section className="bg-white rounded-[32px] border border-[#e5d8d0] p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.01)]" style={cardShadow}>
            <div className="flex items-center justify-between mb-8 border-b border-[#e5d8d0]/60 pb-6">
              <div>
                <h3 className="text-2xl font-black text-[#303330] flex items-center gap-2">
                  <Building size={24} className="text-[#fa7150]" /> Danh Sách Khách Sạn & Resort
                </h3>
                <p className="text-xs text-[#8a7e75] mt-1">Quản lý phòng nghỉ, menu dịch vụ và kiểm tra trạng thái phê duyệt cơ sở của bạn.</p>
              </div>
            </div>

            {/* Dynamic Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Bookings Hôm nay</span>
                <span className="text-xl font-black text-[#303330]">{stats.todayBookings} đơn</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Doanh thu tháng này</span>
                <span className="text-xl font-black text-[#fa7150]">{stats.monthlyRevenue.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Khách đang lưu trú</span>
                <span className="text-xl font-black text-[#303330]">{stats.activeGuests} thú cưng</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Đánh giá trung bình</span>
                <span className="text-xl font-black text-[#44683b]">{stats.rating > 0 ? `${stats.rating} ★` : '—'}</span>
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center text-[#8a7e75] font-bold text-sm flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin"></span>
                Đang tải danh sách cơ sở...
              </div>
            ) : hotels.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-[#faf9f6]/40 p-8">
                <div className="w-16 h-16 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-[#fa7150] mx-auto mb-4">
                  <Building size={28} />
                </div>
                <p className="text-[#8a7e75] font-bold text-sm mb-4">Bạn chưa đăng ký khách sạn nào hoặc đang chờ duyệt cơ sở.</p>
                <button
                  onClick={() => setShowAddHotelModal(true)}
                  className="text-[#fa7150] font-black text-sm hover:underline cursor-pointer"
                >
                  Đăng ký cơ sở đầu tiên ngay →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {hotels.map((hotel) => {
                  const isActive = hotel.status === 'ACTIVE';
                  return (
                    <div 
                      key={hotel.id} 
                      className="bg-[#faf9f6]/40 border border-[#e5d8d0] rounded-3xl p-8 relative group overflow-hidden transition-all duration-300 hover:border-[#fa7150]/40 hover:bg-white hover:shadow-xl hover:shadow-[#fa7150]/2"
                    >
                      <div className="absolute top-0 right-0 w-36 h-36 bg-[#fa7150]/5 rounded-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      
                      {/* Bìa/Ảnh Khách Sạn */}
                      <div className="relative h-48 overflow-hidden rounded-2xl mb-6 bg-gray-50 border border-[#e5d8d0]/60">
                        {hotel.imageUrls && hotel.imageUrls.length > 0 ? (
                          <img 
                            src={hotel.imageUrls[0]} 
                            alt={hotel.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-2">
                            <Building size={32} className="text-[#fa7150]/60" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Chưa có ảnh đại diện</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1.5 max-w-[70%]">
                          <h4 className="text-xl font-black text-[#303330] group-hover:text-[#fa7150] transition-colors">{hotel.name}</h4>
                          <p className="text-xs text-[#8a7e75] flex items-center gap-1.5 leading-relaxed">
                            <MapPin size={14} className="text-[#fa7150]" /> {hotel.address}
                          </p>
                        </div>
                        <span 
                          className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                            isActive 
                              ? 'bg-[#e3f4e1] text-[#2c4e24] border border-[#d0fac0]' 
                              : hotel.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isActive ? 'ĐANG HOẠT ĐỘNG' : hotel.status === 'PENDING' ? 'CHỜ DUYỆT' : 'ĐANG TẠM NGƯNG'}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 mt-4 mb-8 bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-[#e5d8d0]/60 w-fit">
                        <div className="flex items-center gap-1 text-[#f59e0b]">
                          <Star size={16} fill="currentColor" />
                          <span className="text-sm font-black text-[#303330]">{hotel.averageRating || 5.0}</span>
                        </div>
                        <div className="text-xs text-[#8a7e75]">
                          Bán kính: <span className="font-bold text-[#303330]">50km</span>
                        </div>
                      </div>

                      {/* Status Toggle Action */}
                      {hotel.status !== 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleToggleHotelStatus(hotel.id)}
                          className={`w-full mb-4 py-2.5 rounded-2xl text-center font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isActive 
                              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                              : 'bg-[#e3f4e1] border-[#d0fac0] text-emerald-800 hover:bg-[#d0fac0]/20'
                          }`}
                        >
                          {isActive ? 'Tạm Ngưng Hoạt Động (Xóa Mềm)' : 'Kích Hoạt Hoạt Động'}
                        </button>
                      )}

                      {/* Actions Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-[#e5d8d0]/60 pt-6">
                        <Link 
                          to={`/partner/hotels/${hotel.id}/rooms`} 
                          className="bg-white border border-[#e5d8d0] py-3.5 rounded-2xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <Settings size={14} /> Cài đặt phòng
                        </Link>
                        <Link 
                          to={`/partner/hotels/${hotel.id}/services`} 
                          className="bg-white border border-[#e5d8d0] py-3.5 rounded-2xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <ListOrdered size={14} /> Danh mục dịch vụ
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── TAB 2: INTERACTIVE GRID CALENDAR (LỊCH ĐẶT PHÒNG TƯƠNG TÁC) ── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 text-left animate-fadeIn">
            {/* Filter Tabs & Quick Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 bg-[#f0ece9]/60 p-1 rounded-2xl">
                {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setBookingFilter(stat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      bookingFilter === stat
                        ? 'bg-white text-[#303330] shadow-sm'
                        : 'text-[#8a7e75] hover:text-[#303330]'
                    }`}
                  >
                    {stat === 'ALL' ? 'Tất cả' :
                     stat === 'PENDING' ? 'Chờ xác nhận' :
                     stat === 'CONFIRMED' ? 'Đã xác nhận' :
                     stat === 'CHECKED_IN' ? 'Đang lưu trú' : 'Đã hoàn thành'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/partner/bookings')}
                style={orangeGradient}
                className="px-5 py-3 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
              >
                + Tạo đơn mới
              </button>
            </div>

            {/* Grid Table */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
              <div className="p-6 border-b border-[#e5d8d0]/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#faf9f6]/30">
                
                {/* Hotel Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Cơ sở:</span>
                  <select 
                    value={selectedHotelId || ''} 
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                    className="bg-white border border-[#e5d8d0] rounded-xl px-3.5 py-2 text-xs font-bold text-[#303330] focus:outline-none focus:border-[#fa7150]"
                  >
                    {hotels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePrevWeek} 
                    className="px-3 py-2 border border-[#e5d8d0] bg-white rounded-xl text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-colors"
                  >
                    Tuần trước
                  </button>
                  
                  <span className="text-xs font-black text-[#303330] uppercase tracking-wider px-1">
                    {selectedWeekStart.getDate()}/{selectedWeekStart.getMonth() + 1} - {(() => {
                      const end = new Date(selectedWeekStart)
                      end.setDate(selectedWeekStart.getDate() + 6)
                      return `${end.getDate()}/${end.getMonth() + 1}`
                    })()}
                  </span>

                  <button 
                    onClick={handleNextWeek} 
                    className="px-3 py-2 border border-[#e5d8d0] bg-white rounded-xl text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-colors"
                  >
                    Tuần sau
                  </button>
                  
                  <button 
                    onClick={handleCurrentWeek} 
                    className="px-3 py-2 border border-[#fa7150]/20 bg-[#fa7150]/5 text-[#fa7150] rounded-xl text-xs font-bold hover:bg-[#fa7150]/10 transition-colors"
                  >
                    Hôm nay
                  </button>
                </div>

              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#faf9f6]/80 text-[10px] font-black text-[#8a7e75] uppercase tracking-wider border-b border-[#e5d8d0]/80">
                      <th className="p-4 text-left pl-6 border-r border-[#e5d8d0]/50">Phòng / Ngày</th>
                      {getWeekDates(selectedWeekStart).map((date, i) => {
                        const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
                        const isToday = formatDateString(date) === formatDateString(new Date())
                        return (
                          <th key={i} className={`p-4 text-center border-r border-[#e5d8d0]/50 ${isToday ? 'text-[#fa7150] font-black' : ''}`}>
                            {daysOfWeek[i]} ({date.getDate()})
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5d8d0]/60 text-xs">
                    {calendarLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#8a7e75] font-bold">
                          <span className="inline-block w-6 h-6 rounded-full border-2 border-[#fa7150]/20 border-t-[#fa7150] animate-spin mr-2 align-middle"></span>
                          Đang tải lịch đặt phòng...
                        </td>
                      </tr>
                    ) : roomTypes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#8a7e75] font-bold">
                          Chưa có loại phòng nào được cấu hình cho cơ sở này.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const weekDates = getWeekDates(selectedWeekStart)
                        const weekDatesStr = weekDates.map(d => formatDateString(d))
                        const weekEndStr = weekDatesStr[6]
                        const weekStartStr = weekDatesStr[0]

                        // Filter active bookings within this week
                        const activeBookings = bookings.filter(b => {
                          if (b.status === 'CANCELLED') return false
                          // Apply status filter if set
                          if (bookingFilter !== 'ALL' && b.status !== bookingFilter) return false
                          return b.checkInDate <= weekEndStr && b.checkOutDate >= weekStartStr
                        })

                        // Map RoomTypes to rows
                        return roomTypes.flatMap((rt) => {
                          const rtBookings = activeBookings.filter(b => b.roomTypeId === rt.id)
                          const totalRooms = rt.totalRooms || 1
                          
                          // Initialize rows for this RoomType
                          const rows = Array.from({ length: totalRooms }, (_, i) => ({
                            rowIndex: i,
                            bookings: [] as any[]
                          }))

                          // Sort bookings by check-in date to allocate greedily
                          const sortedRtBookings = [...rtBookings].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))

                          for (const b of sortedRtBookings) {
                            let assigned = false
                            for (const r of rows) {
                              const hasOverlap = r.bookings.some(existing => {
                                return !(b.checkOutDate <= existing.checkInDate || existing.checkOutDate <= b.checkInDate)
                              })
                              if (!hasOverlap) {
                                r.bookings.push(b)
                                assigned = true
                                break
                              }
                            }
                            if (!assigned) {
                              rows.push({ rowIndex: rows.length, bookings: [b] })
                            }
                          }

                          // Render rows
                          return rows.map((row, rowIdx) => {
                            let skippedCount = 0
                            return (
                              <tr key={`${rt.id}-${row.rowIndex}`} className="h-20">
                                {/* Room Label cell */}
                                {rowIdx === 0 ? (
                                  <td 
                                    className="p-4 pl-6 font-bold text-[#303330] border-r border-[#e5d8d0]/50 bg-[#faf9f6]/10"
                                    rowSpan={rows.length}
                                    style={{ width: '220px', minWidth: '200px' }}
                                  >
                                    <span className="block font-black text-sm text-[#303330]">{rt.name}</span>
                                    <span className="text-[10px] text-[#8a7e75] font-semibold block mt-0.5 leading-tight">
                                      {rt.allowedPetTypes?.join(', ') || 'Chó & Mèo'} • {rt.pricePerNight?.toLocaleString('vi-VN')}đ
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-[#fa7150] font-black block mt-2">
                                      Tổng: {totalRooms} phòng
                                    </span>
                                  </td>
                                ) : null}

                                {/* Day cells */}
                                {weekDates.map((dayDate, colIndex) => {
                                  if (skippedCount > 0) {
                                    skippedCount--
                                    return null
                                  }

                                  const dayStr = formatDateString(dayDate)
                                  const activeBooking = row.bookings.find(b => dayStr >= b.checkInDate && dayStr < b.checkOutDate)

                                  if (activeBooking) {
                                    // Count span
                                    let span = 0
                                    while (
                                      colIndex + span < 7 &&
                                      formatDateString(weekDates[colIndex + span]) >= activeBooking.checkInDate &&
                                      formatDateString(weekDates[colIndex + span]) < activeBooking.checkOutDate
                                    ) {
                                      span++
                                    }
                                    skippedCount = span - 1

                                    // Determine status and styling
                                    let bgStyle = 'bg-gray-50 border-gray-200 text-gray-800'
                                    let label = 'Chờ thanh toán'
                                    if (activeBooking.status === 'CHECKED_IN') {
                                      bgStyle = 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
                                      label = 'Đang lưu trú'
                                    } else if (activeBooking.status === 'CONFIRMED') {
                                      bgStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      label = 'Đã thanh toán'
                                    } else if (activeBooking.status === 'PENDING') {
                                      bgStyle = 'bg-amber-50 border-amber-200 text-amber-800'
                                      label = 'Chờ xác nhận'
                                    } else if (activeBooking.status === 'COMPLETED') {
                                      bgStyle = 'bg-blue-50 border-blue-200 text-blue-800'
                                      label = 'Đã hoàn thành'
                                    }

                                    const petsText = activeBooking.pets?.map((p: any) => p.name).join(', ') || 'Thú cưng'
                                    const ownerText = activeBooking.ownerName || 'Khách'

                                    return (
                                      <td key={colIndex} className="p-2 border-r border-[#e5d8d0]/50" colSpan={span}>
                                        <div 
                                          onClick={() => navigate(`/partner/bookings?id=${activeBooking.id}`)}
                                          className={`border p-2.5 rounded-2xl flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${bgStyle}`}
                                        >
                                          <img 
                                            src={getPetAvatar(activeBooking.pets?.[0]?.species)} 
                                            className="w-7 h-7 rounded-full object-cover border border-white/40 shrink-0" 
                                          />
                                          <div className="text-left leading-tight overflow-hidden">
                                            <span className="font-black block text-[10px] truncate">{petsText} ({ownerText})</span>
                                            <span className="text-[8px] font-bold uppercase tracking-wider block mt-0.5">{label}</span>
                                          </div>
                                        </div>
                                      </td>
                                    )
                                  }

                                  return (
                                    <td key={colIndex} className="p-2 border-r border-[#e5d8d0]/50"></td>
                                  )
                                })}
                              </tr>
                            )
                          })
                        })
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-6 flex flex-col justify-between" style={cardShadow}>
                <div>
                  <span className="text-xs font-bold text-emerald-800 block mb-1">Công suất phòng</span>
                  <span className="text-3xl font-black text-emerald-950">84%</span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 mt-4 flex items-center gap-1">
                  <TrendingUp size={12} /> +12% so với hôm qua
                </span>
              </div>

              <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 text-xs font-bold text-[#8a7e75]" style={cardShadow}>
                <span className="text-[10px] font-black uppercase text-[#303330] tracking-wider block mb-4">Chú thích màu sắc</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Đã thanh toán</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> Đã đặt cọc</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" /> Sắp trả phòng</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-300" /> Chờ thanh toán</div>
                </div>
              </div>

              <div className="bg-rose-50 rounded-3xl border border-rose-100 p-6 flex flex-col justify-between" style={cardShadow}>
                <div>
                  <span className="text-xs font-bold text-rose-800 block mb-1">Khách Walk-in chờ</span>
                  <span className="text-3xl font-black text-rose-950">03 bé</span>
                </div>
                <button
                  type="button"
                  className="mt-4 px-4 py-2.5 bg-[#a43e24] hover:bg-[#fa7150] text-white text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer w-fit"
                >
                  Xử lý ngay
                </button>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <QrCode className="text-[#fa7150]" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Check-in nhanh</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">Quét mã QR hoặc nhập mã đơn</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <Sparkles className="text-emerald-600" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Yêu cầu dọn dẹp</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">5 phòng đang chờ vệ sinh</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <FileText className="text-[#fa7150]" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Xuất báo cáo ngày</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">Tải về file Excel/PDF</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PAPERLESS OPERATION (QUY TRÌNH KHÔNG GIẤY TỜ) ── */}
        {activeTab === 'paperless' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Column 1 & 2: Check-in / Check-out Workspace */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-8" style={cardShadow}>
              <div className="flex justify-between items-center border-b border-[#e5d8d0]/60 pb-4">
                <h3 className="text-2xl font-black text-[#303330]">Quy trình Không giấy tờ</h3>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  <Clock size={14} /> Lịch sử Giao dịch
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Check-in Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#a43e24] text-white flex items-center justify-center font-black text-xs">1</span>
                    <h4 className="text-base font-black text-[#303330]">Thủ tục Check-in</h4>
                  </div>

                  {/* Photo Capture Area */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Ảnh khi đến</label>
                    <div className="h-44 bg-[#faf9f6] border border-[#e5d8d0] rounded-3xl flex flex-col items-center justify-center gap-2 text-[#8a7e75] cursor-pointer hover:border-[#fa7150] transition-colors">
                      <Camera size={26} />
                      <span className="text-[10px] font-bold">Chụp ảnh thú cưng hiện tại</span>
                    </div>
                  </div>

                  {/* Pet Name input */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Tên Thú cưng</label>
                    <input
                      type="text"
                      value={checkInPetName}
                      onChange={e => setCheckInPetName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Health status notes */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Tình trạng Sức khỏe</label>
                    <textarea
                      value={checkInHealth}
                      onChange={e => setCheckInHealth(e.target.value)}
                      rows={3}
                      placeholder="Ghi chú về thương tích, tâm trạng, thói quen ăn uống..."
                      className="w-full p-4 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Signature pad representation */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Chữ ký Xác nhận (Chủ sở hữu)</label>
                    <div className="h-28 bg-[#faf9f6] border border-[#e5d8d0] rounded-3xl relative flex items-center justify-center">
                      {isSigned ? (
                        <span className="text-xs font-black font-mono text-[#44683b] uppercase tracking-widest border-2 border-[#44683b] px-3 py-1.5 rounded-xl rotate-[-6deg]">
                          ✓ ĐÃ KÝ XÁC NHẬN
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setIsSigned(true); }}
                          className="px-4 py-2 border border-dashed border-[#fa7150] rounded-xl text-[#fa7150] text-[10px] font-black uppercase cursor-pointer"
                        >
                          Ký xác nhận tại đây
                        </button>
                      )}
                      {isSigned && (
                        <button
                          type="button"
                          onClick={() => { setIsSigned(false); }}
                          className="absolute bottom-2 right-4 text-[9px] font-black text-[#a43e24] uppercase hover:underline cursor-pointer"
                        >
                          XÓA CHỮ KÝ
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={orangeGradient}
                    className="w-full py-4 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Gửi hóa đơn qua Zalo/SMS
                  </button>
                </div>

                {/* 2. Check-out Payment Section */}
                <div className="space-y-6 border-t md:border-t-0 md:border-l border-[#e5d8d0]/60 md:pl-8">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#44683b] text-white flex items-center justify-center font-black text-xs">2</span>
                    <h4 className="text-base font-black text-[#303330]">Thanh toán Check-out</h4>
                  </div>

                  {/* Line items details */}
                  <div className="space-y-3 bg-[#faf9f6] p-5 rounded-3xl border border-[#e5d8d0]/60">
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Phòng Deluxe (3 đêm)</span>
                      <span className="font-black text-[#303330]">1,050,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Tắm & Spa (Gói Cơ bản)</span>
                      <span className="font-black text-[#303330]">250,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Thức ăn hạt cao cấp (x2)</span>
                      <span className="font-black text-[#303330]">120,000đ</span>
                    </div>
                    <div className="h-px bg-[#e5d8d0]/60 my-2" />
                    <div className="flex justify-between items-center text-sm font-bold text-[#303330]">
                      <span>Tạm tính</span>
                      <span className="text-[#a43e24] font-black text-base">1,420,000đ</span>
                    </div>
                  </div>

                  {/* Promo code */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá..."
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                    <button className="px-4 py-2.5 bg-[#44683b] hover:bg-[#2c4e24] text-white rounded-2xl text-xs font-bold cursor-pointer">
                      Áp dụng
                    </button>
                  </div>

                  {/* Points Loyalty Toggle */}
                  <div className="flex justify-between items-center p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Sparkles size={14} /> Sử dụng 500 điểm thưởng
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={e => setUsePoints(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#44683b]" />
                    </label>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <span className="text-[10px] font-black text-[#8a7e75] uppercase block">TỔNG THANH TOÁN</span>
                      <span className="text-3xl font-black text-[#303330]">{usePoints ? '1,370,000đ' : '1,420,000đ'}</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowQrPay(!showQrPay)}
                        className="px-5 py-3.5 bg-[#303330] text-white font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center gap-2 hover:bg-black transition-colors cursor-pointer"
                      >
                        <QrCode size={16} /> Quét để thanh toán
                      </button>

                      {showQrPay && (
                        <div className="absolute right-0 bottom-16 bg-white border border-[#e5d8d0] p-4 rounded-3xl shadow-xl w-48 text-center animate-in fade-in zoom-in duration-200 z-10">
                          <span className="text-[9px] font-black uppercase text-[#8a7e75] block mb-2">Quét mã VietQR</span>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vietqr-payment-payload" className="w-32 h-32 mx-auto mb-2" />
                          <span className="text-[10px] font-black text-[#303330] block">{usePoints ? '1,370,000đ' : '1,420,000đ'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: E-Invoice Preview */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col justify-between" style={cardShadow}>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#e5d8d0]/40 pb-4">
                  <h3 className="text-base font-black text-[#303330] flex items-center gap-2">
                    <FileText size={18} className="text-[#fa7150]" />
                    Hóa đơn điện tử #INV-9902
                  </h3>
                  <button className="text-[10px] font-black text-[#fa7150] hover:underline">Xem bản đầy đủ</button>
                </div>

                <div className="space-y-4 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Khách hàng</span>
                    <span className="text-[#303330]">NGUYỄN ANH THƯ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Thú cưng</span>
                    <span className="text-[#303330]">MOCHI (GOLDEN)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Thời gian</span>
                    <span className="text-[#303330]">12/10 - 15/10/2023</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e5d8d0]/60 mt-6 flex gap-3">
                <button className="flex-1 py-3 bg-[#f0ece9] text-[#5a5550] rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#e5d8d0] transition-colors cursor-pointer">
                  <Download size={14} /> Tải xuống PDF
                </button>
                <button className="flex-1 py-3 bg-[#f0ece9] text-[#5a5550] rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#e5d8d0] transition-colors cursor-pointer">
                  <Printer size={14} /> In nhanh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CRM ANALYTICS & PET PROFILES (PHÂN TÍCH & CRM) ── */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Left 2 Columns: Revenue Chart & Customer List */}
            <div className="lg:col-span-2 space-y-8">
              {/* Revenue chart & ratios stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 6 Months Revenue bar chart */}
                <div className="bg-white p-6 rounded-[2rem] border border-[#e5d8d0] md:col-span-2 flex flex-col justify-between" style={cardShadow}>
                  <div>
                    <h4 className="text-base font-black text-[#303330] mb-1">Biểu đồ Doanh thu</h4>
                    <p className="text-[10px] text-[#8a7e75] mb-4">Doanh thu Dự kiến vs Thực tế (6 tháng qua)</p>
                  </div>
                  <div className="h-44 flex items-end justify-between px-2 pt-6 border-b border-[#e5d8d0]/60 pb-2">
                    {[
                      { month: 'Th5', val: 30 },
                      { month: 'Th6', val: 45 },
                      { month: 'Th7', val: 75, active: true },
                      { month: 'Th8', val: 35 },
                      { month: 'Th9', val: 50 },
                      { month: 'Th10', val: 85, active: true }
                    ].map((m, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div 
                          style={{ height: `${m.val * 1.3}px` }}
                          className={`w-7 sm:w-9 rounded-t-lg transition-all duration-300 ${
                            m.active 
                              ? 'bg-[#a43e24] shadow-sm shadow-[#a43e24]/10' 
                              : 'bg-[#a43e24]/40 group-hover:bg-[#a43e24]/60'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-[#8a7e75]">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 1 Column Stats: Occupancy & Top Service */}
                <div className="space-y-6">
                  {/* Occupancy card */}
                  <div className="bg-[#e2f0d9] border border-[#c5e0b4] p-5 rounded-3xl text-left">
                    <span className="text-[10px] font-black text-[#385723] uppercase block mb-1">Tỷ lệ Lấp đầy</span>
                    <span className="text-3xl font-black text-[#385723] block">87.5%</span>
                    <span className="text-[9px] font-bold text-[#385723]/80 block mt-2">↑ +12% so với tháng trước</span>
                  </div>
                  {/* Top service card */}
                  <div className="bg-[#fa7150]/15 border border-[#fa7150]/20 p-5 rounded-3xl text-left">
                    <span className="text-[10px] font-black text-[#a43e24] uppercase block mb-1">Dịch vụ Hàng đầu</span>
                    <span className="text-2xl font-black text-[#a43e24] block leading-tight">Spa Trị liệu</span>
                    <span className="text-[9px] font-bold text-[#a43e24]/80 block mt-2">Chiếm 42% doanh thu phụ trợ</span>
                  </div>
                </div>
              </div>

              {/* Customers list */}
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6" style={cardShadow}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-[#303330]">Danh sách Khách hàng</h3>
                  <button className="px-4 py-2 bg-[#a43e24] hover:bg-[#fa7150] text-white text-xs font-bold rounded-full cursor-pointer">
                    Thêm Khách hàng Mới
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { name: 'Nguyễn Minh Anh', pets: '2 Thú cưng (Mochi, Bơ)', amount: '12.500.000đ', rating: '4.9', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=60' },
                    { name: 'Trần Hoàng Long', pets: 'Đã nhận phòng (Rocky)', amount: '8.200.000đ', rating: '5.0', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60' },
                    { name: 'Lê Tuyết Mai', pets: 'Lịch sử: 8 lần đặt', amount: '24.150.000đ', rating: '4.8', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=60' },
                  ].map((cust, idx) => (
                    <div key={idx} className="p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl flex items-center justify-between hover:border-[#fa7150]/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedPet({
                        name: 'Rocky',
                        breed: 'Golden Retriever',
                        age: '3 Tuổi',
                        status: 'Đang lưu trú',
                        behavior: 'Hay gặm nhẹ - Khi gặp người lạ hoặc lúc ăn. Cần tiếp cận chậm rãi.',
                        diet: 'Hạt mềm - Không ăn được xương cứng, thích hạt trộn pate gà.',
                        health: 'Sức khỏe - Dị ứng xà phòng mùi mạnh. Sử dụng loại thảo mộc.',
                        img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=150'
                      })}
                    >
                      <div className="flex items-center gap-4">
                        <img src={cust.avatar} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="text-left leading-tight">
                          <span className="font-black text-sm text-[#303330] block">{cust.name}</span>
                          <span className="text-[10px] text-[#8a7e75] block mt-0.5">{cust.pets}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-[#303330] block">{cust.amount}</span>
                        <span className="text-[10px] text-[#f59e0b] font-black flex items-center justify-end gap-0.5 mt-0.5">
                          ★ {cust.rating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column Profile Details */}
            {selectedPet && (
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col justify-between" style={cardShadow}>
                <div className="space-y-6">
                  {/* Pet Photo */}
                  <div className="relative rounded-2xl overflow-hidden h-40">
                    <img src={selectedPet.img} alt={selectedPet.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 right-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase px-3 py-1 rounded-full">
                      {selectedPet.status}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div className="border-b border-[#e5d8d0]/40 pb-4">
                    <h3 className="text-2xl font-black text-[#303330]">{selectedPet.name}</h3>
                    <p className="text-xs text-[#8a7e75] mt-1 font-bold">{selectedPet.breed} • {selectedPet.age}</p>
                  </div>

                  {/* Special Care Rules */}
                  <div className="space-y-4 text-xs font-bold text-[#5a5550]">
                    <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-wider block">Ghi chú chăm sóc đặc biệt</span>
                    
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex gap-2 items-start">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-rose-800">Tính cách</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.behavior}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex gap-2 items-start">
                      <PawPrint size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-emerald-800">Chế độ ăn</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.diet}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-[#faf9f6] border border-[#e5d8d0] text-[#303330] rounded-2xl flex gap-2 items-start">
                      <Settings size={16} className="shrink-0 mt-0.5 text-[#8a7e75]" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-[#8a7e75]">Sức khỏe</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.health}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3.5 bg-[#303330] hover:bg-black text-white text-xs font-black uppercase rounded-full tracking-wider mt-6 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Edit size={14} /> Cập nhật Hồ sơ {selectedPet.name}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: SYSTEM SETTINGS (CÀI ĐẶT HỆ THỐNG) ── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Settings Control Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tab menu subtabs */}
              <div className="flex gap-2 border-b border-[#e5d8d0]/60 pb-3">
                <button
                  onClick={() => setSettingsSubTab('channels')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'channels' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Kênh Liên lạc
                </button>
                <button
                  onClick={() => setSettingsSubTab('loyalty')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'loyalty' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Khách hàng Thân thiết
                </button>
                <button
                  onClick={() => setSettingsSubTab('general')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'general' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Thông số Chung
                </button>
              </div>

              {/* Channels list config */}
              {settingsSubTab === 'channels' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-4" style={cardShadow}>
                  <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                    <Mail size={18} className="text-[#fa7150]" />
                    Các kênh đang hoạt động
                  </h3>
                  {[
                    { label: 'Thông báo Email', desc: 'Email giao dịch qua SendGrid', key: 'email' },
                    { label: 'Tin nhắn SMS (Twilio)', desc: 'Cảnh báo tức thì khi nhận thú cưng', key: 'sms' },
                    { label: 'Zalo OA (Official Account)', desc: 'Tích hợp khu vực cho Việt Nam', key: 'zalo' },
                  ].map((ch, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl">
                      <div>
                        <span className="text-sm font-black text-[#303330] block">{ch.label}</span>
                        <span className="text-[10px] text-[#8a7e75] block mt-0.5">{ch.desc}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(channels as any)[ch.key]}
                          onChange={(e) => setChannels(prev => ({ ...prev, [ch.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fa7150]" />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Loyalty Programs Settings (Image 5) */}
              {settingsSubTab === 'loyalty' && (
                <div className="space-y-6">
                  {/* Point rule settings */}
                  <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 flex justify-between items-center" style={cardShadow}>
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest block mb-1">CÔNG CỤ CỐT LÕI</span>
                      <h4 className="text-xl font-black text-[#303330]">Quy tắc Tích điểm</h4>
                    </div>
                    <div className="flex gap-2 items-center bg-[#faf9f6] p-3 rounded-2xl border border-[#e5d8d0]">
                      <input
                        type="text"
                        value={pointRule}
                        onChange={e => setPointRule(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-xs font-mono text-[#a43e24] w-36 text-center"
                      />
                      <button className="p-1 text-[#fa7150] hover:text-[#a43e24]"><Edit size={14} /></button>
                    </div>
                  </div>

                  {/* Loyalty Tiers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                    {[
                      { title: 'Bạc (Silver)', limit: '0 VNĐ', multiplier: '1.0x', perk1: 'Truy cập Phòng Tiêu chuẩn', perk2: 'Cập nhật Bản tin Ưu đãi', bg: 'bg-[#faf9f6]', text: 'text-[#303330]' },
                      { title: 'Vàng (Gold)', limit: '5,000,000 VNĐ', multiplier: '1.2x', perk1: 'Ưu tiên Đặt lịch nghỉ dưỡng', perk2: 'Tắm Spa Miễn phí (Hàng tháng)', perk3: 'Giảm 10% tại Cửa hàng', bg: 'bg-white border-2 border-[#fa7150]', text: 'text-[#fa7150]' },
                      { title: 'Bạch kim (Platinum)', limit: '20,000,000 VNĐ', multiplier: '1.5x', perk1: 'Hỗ trợ Quản gia Riêng biệt', perk2: 'Nâng cấp Phòng Deluxe Vô hạn', perk3: 'Tổ chức Sinh nhật cho bé', bg: 'bg-[#303330] text-white', text: 'text-[#fa7150]' }
                    ].map((tier, idx) => (
                      <div key={idx} className={`p-6 rounded-[2rem] border border-[#e5d8d0] flex flex-col justify-between h-80 ${tier.bg}`} style={cardShadow}>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="font-black text-sm block">{tier.title}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">{tier.multiplier}</span>
                          </div>
                          <div className="text-[10px] font-bold text-[#8a7e75]">Chi tiêu từ {tier.limit}</div>
                          <ul className="space-y-2 text-[10px] font-bold list-disc pl-4 text-[#8a7e75]">
                            <li>{tier.perk1}</li>
                            <li>{tier.perk2}</li>
                            {tier.perk3 && <li>{tier.perk3}</li>}
                          </ul>
                        </div>
                        <button className="w-full py-2 bg-[#f0ece9]/60 text-[#303330] font-bold text-[10px] rounded-xl hover:bg-[#e5d8d0] transition-colors cursor-pointer mt-4">
                          Sửa Chi tiết
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Redemption Catalog Table */}
                  <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6" style={cardShadow}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-black text-[#303330]">Danh mục Đổi thưởng</h3>
                      <button style={greenGradient} className="px-3.5 py-1.5 text-white text-[10px] font-black uppercase rounded-full cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
                        Thêm Phần thưởng
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-[#faf9f6] border-b border-[#e5d8d0] text-[9px] font-black text-[#8a7e75] uppercase tracking-wider">
                            <th className="p-4 pl-6">Vật phẩm thưởng</th>
                            <th className="p-4">Danh mục</th>
                            <th className="p-4 text-center">Chi phí điểm</th>
                            <th className="p-4">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5d8d0]/60 font-bold">
                          {[
                            { item: 'Một buổi Spa Miễn phí', cat: 'Làm đẹp', cost: '50 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' },
                            { item: 'Nâng cấp một Đêm lưu trú', cat: 'Lưu trú', cost: '120 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' },
                            { item: 'Bữa ăn Gourmet bổ sung', cat: 'Ăn uống', cost: '30 điểm', status: 'Bản nháp', color: 'text-[#8a7e75] bg-gray-100' },
                            { item: 'Đưa đón Sân bay Ưu tiên', cat: 'Vận chuyển', cost: '200 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' }
                          ].map((red, idx) => (
                            <tr key={idx} className="hover:bg-[#faf9f6]/30">
                              <td className="p-4 pl-6">{red.item}</td>
                              <td className="p-4 text-[#8a7e75]">{red.cat}</td>
                              <td className="p-4 text-center text-[#a43e24] font-black">{red.cost}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${red.color}`}>{red.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* General Settings parameters */}
              {settingsSubTab === 'general' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6" style={cardShadow}>
                  <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                    <Settings size={18} className="text-[#fa7150]" />
                    Thông số Chung
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Tiền tệ</span>
                      <select
                        value={generalSettings.currency}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="VND">VND (đ) - Việt Nam Đồng</option>
                        <option value="USD">USD ($) - Đô la Mỹ</option>
                      </select>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Múi giờ</span>
                      <select
                        value={generalSettings.timezone}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Bangkok">(GMT+07:00) Bangkok, Hanoi</option>
                        <option value="Singapore">(GMT+08:00) Singapore, Kuala Lumpur</option>
                      </select>
                    </div>

                    <div className="col-span-2 pt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest">Thời gian giãn cách đặt phòng (Phút)</span>
                        <span className="text-sm font-black text-[#fa7150]">{generalSettings.cooldown}m</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="120"
                        step="15"
                        value={generalSettings.cooldown}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, cooldown: Number(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#fa7150]"
                      />
                      <span className="text-[9px] text-[#8a7e75] mt-1.5 block">Thời gian tối thiểu giữa các lần đặt phòng liên tiếp để làm vệ sinh.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Template editor */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 flex flex-col justify-between" style={cardShadow}>
              <div className="space-y-6">
                <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#fa7150]" />
                  Mẫu Thông báo
                </h3>
                
                {/* Pills */}
                <div className="flex gap-2 flex-wrap">
                  {['Xác nhận nhận phòng', 'Chúc mừng sinh nhật', 'Nhắc lịch tiêm chủng'].map((t, idx) => (
                    <span key={idx} className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer border ${idx === 0 ? 'bg-[#fa7150]/15 text-[#fa7150] border-[#fa7150]/30' : 'bg-[#faf9f6] text-[#8a7e75] border-[#e5d8d0]'}`}>
                      {t}
                    </span>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Tiêu đề Email</label>
                    <input
                      type="text"
                      value="Xác nhận dịch vụ tại PetCare Hub"
                      readOnly
                      className="w-full px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Nội dung thông báo</label>
                    <textarea
                      value={emailTemplate}
                      onChange={e => setEmailTemplate(e.target.value)}
                      rows={5}
                      className="w-full p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl text-xs font-semibold outline-none focus:border-[#fa7150]"
                    />
                  </div>

                  {/* Template placeholder pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['{{pet_name}}', '{{check_in_date}}', '{{room_type}}', '{{owner_name}}'].map((pill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg">{pill}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e5d8d0]/60 mt-6 flex gap-3">
                <button
                  type="button"
                  style={orangeGradient}
                  className="flex-1 py-3 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#fa7150]/10 hover:opacity-95 cursor-pointer"
                >
                  <Save size={14} /> Lưu Mẫu
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL THÊM KHÁCH SẠN (WIZARD 3 BƯỚC) */}
      {showAddHotelModal && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left my-8">
            
            {/* Tiêu đề Modal & Stepper */}
            <div className="border-b border-[#e5d8d0]/60 pb-5 mb-6">
              <h3 className="text-2xl font-black text-[#303330]">Đăng ký Đối tác & Cơ sở mới</h3>
              <p className="text-xs text-[#8a7e75] mt-1">Hoàn thành 3 bước đăng ký thông tin để gửi hồ sơ phê duyệt.</p>
              
              {/* Stepper bar */}
              <div className="flex items-center justify-between mt-6 max-w-md mx-auto">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 1 ? 'bg-[#fa7150] text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-[#fa7150]">Cửa hàng</span>
                </div>
                <div className={`flex-1 h-[2px] mx-2 ${wizardStep >= 2 ? 'bg-[#fa7150]' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 2 ? 'bg-[#fa7150] text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
                  <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${wizardStep >= 2 ? 'text-[#fa7150]' : 'text-gray-400'}`}>Pháp lý</span>
                </div>
                <div className={`flex-1 h-[2px] mx-2 ${wizardStep >= 3 ? 'bg-[#fa7150]' : 'bg-gray-200'}`} />
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${wizardStep >= 3 ? 'bg-[#fa7150] text-white' : 'bg-gray-100 text-gray-400'}`}>3</div>
                  <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${wizardStep >= 3 ? 'text-[#fa7150]' : 'text-gray-400'}`}>Tài chính</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddHotel} className="space-y-6 text-xs font-bold">
              
              {/* ── BƯỚC 1: HỒ SƠ CỬA HÀNG ── */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên thương hiệu / Cửa hàng</label>
                      <input
                        type="text"
                        required
                        value={newHotelName}
                        onChange={e => setNewHotelName(e.target.value)}
                        placeholder="Ví dụ: Miu Miu Pet Hotel"
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none focus:border-[#fa7150]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Đối tượng thú cưng tiếp nhận</label>
                      <select
                        value={petTarget}
                        onChange={e => setPetTarget(e.target.value as any)}
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                      >
                        <option value="BOTH">Nhận cả Chó và Mèo</option>
                        <option value="DOG_ONLY">Chỉ nhận Chó</option>
                        <option value="CAT_ONLY">Chỉ nhận Mèo</option>
                      </select>
                    </div>
                  </div>

                  {/* Địa chỉ phân cấp */}
                  <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60 space-y-4">
                    <span className="text-[10px] text-[#fa7150] uppercase tracking-wider block mb-1">Địa chỉ cửa hàng</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Tỉnh / Thành phố</label>
                        <select
                          value={hotelProvince}
                          onChange={e => setHotelProvince(e.target.value)}
                          className="w-full p-2.5 bg-white border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                        >
                          <option value="Thành phố Hồ Chí Minh">TP. Hồ Chí Minh</option>
                          <option value="Hà Nội">Hà Nội</option>
                          <option value="Đà Nẵng">Đà Nẵng</option>
                          <option value="Bình Dương">Bình Dương</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Quận / Huyện</label>
                        <input
                          type="text"
                          required
                          value={hotelDistrict}
                          onChange={e => setHotelDistrict(e.target.value)}
                          placeholder="Ví dụ: Quận 1"
                          className="w-full p-2.5 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Phường / Xã</label>
                        <input
                          type="text"
                          required
                          value={hotelWard}
                          onChange={e => setHotelWard(e.target.value)}
                          placeholder="Ví dụ: Phường Bến Nghé"
                          className="w-full p-2.5 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Địa chỉ chi tiết (Số nhà, tên đường)</label>
                      <input
                        type="text"
                        required
                        value={hotelStreet}
                        onChange={e => setHotelStreet(e.target.value)}
                        placeholder="Ví dụ: 123 Nguyễn Huệ"
                        className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Loại hình dịch vụ */}
                  <div>
                    <label className="block text-[#8a7e75] mb-2 uppercase">Loại hình dịch vụ cung cấp (Multi-select)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60">
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={serviceBoarding} onChange={e => setServiceBoarding(e.target.checked)} className="rounded text-[#fa7150]" />
                        <span>Khách sạn lưu trú</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={serviceGrooming} onChange={e => setServiceGrooming(e.target.checked)} className="rounded text-[#fa7150]" />
                        <span>Tắm & Grooming</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={serviceVet} onChange={e => setServiceVet(e.target.checked)} className="rounded text-[#fa7150]" />
                        <span>Thú y & Bệnh viện</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={serviceShop} onChange={e => setServiceShop(e.target.checked)} className="rounded text-[#fa7150]" />
                        <span>Pet Shop / Phụ kiện</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={serviceOther} onChange={e => setServiceOther(e.target.checked)} className="rounded text-[#fa7150]" />
                        <span>Dịch vụ khác</span>
                      </label>
                    </div>
                  </div>

                  {/* Khung giờ hoạt động & Hình ảnh */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Giờ mở cửa</label>
                        <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full p-2.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none" />
                      </div>
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Giờ đóng cửa</label>
                        <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full p-2.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="block text-[#8a7e75] uppercase">Tải hình ảnh cửa hàng</span>
                      <div className="flex gap-2">
                        {/* Logo upload */}
                        <div className="flex-1 text-center">
                          <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] hover:border-[#fa7150] rounded-xl p-3 flex flex-col items-center justify-center transition-colors relative min-h-[70px] overflow-hidden">
                            <input type="file" accept=".png,.jpg,.jpeg" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
                            {uploadingField === 'logo' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            {logoUrl ? (
                              <img src={logoUrl} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <>
                                <Upload size={16} className="text-[#fa7150] mb-1" />
                                <span className="text-[8px] uppercase">Logo</span>
                              </>
                            )}
                          </label>
                        </div>
                        {/* Front upload */}
                        <div className="flex-1 text-center">
                          <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] hover:border-[#fa7150] rounded-xl p-3 flex flex-col items-center justify-center transition-colors relative min-h-[70px] overflow-hidden">
                            <input type="file" accept=".png,.jpg,.jpeg" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'front')} />
                            {uploadingField === 'front' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            {frontUrl ? (
                              <img src={frontUrl} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <>
                                <Upload size={16} className="text-[#fa7150] mb-1" />
                                <span className="text-[8px] uppercase">Mặt tiền</span>
                              </>
                            )}
                          </label>
                        </div>
                        {/* Rooms upload */}
                        <div className="flex-1 text-center">
                          <label className="cursor-pointer bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] hover:border-[#fa7150] rounded-xl p-3 flex flex-col items-center justify-center transition-colors relative min-h-[70px] overflow-hidden">
                            <input type="file" accept=".png,.jpg,.jpeg" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'rooms')} />
                            {uploadingField === 'rooms' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            {roomsUrl ? (
                              <img src={roomsUrl} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <>
                                <Upload size={16} className="text-[#fa7150] mb-1" />
                                <span className="text-[8px] uppercase">Cơ sở vật chất</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                      {uploadingField && <p className="text-[9px] text-[#fa7150] font-bold animate-pulse text-right">Đang tải tệp tin lên hệ thống...</p>}
                    </div>
                  </div>

                  {/* Chuyển bước */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d8d0]/60">
                    <button type="button" onClick={() => setShowAddHotelModal(false)} className="px-5 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer">Hủy bỏ</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newHotelName.trim() || !hotelStreet.trim() || !hotelDistrict.trim()) {
                          alert('Vui lòng điền đầy đủ Tên cửa hàng và Địa chỉ trước khi tiếp tục.')
                          return
                        }
                        setWizardStep(2)
                      }}
                      className="px-6 py-3 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md hover:scale-[1.01] transition-transform"
                    >
                      Tiếp tục bước 2
                    </button>
                  </div>
                </div>
              )}

              {/* ── BƯỚC 2: THÔNG TIN PHÁP LÝ & KYC ── */}
              {wizardStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-4">
                    <span className="text-[10px] text-[#fa7150] uppercase tracking-wider block mb-1">Hồ sơ định danh cá nhân / Doanh nghiệp</span>
                    
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Số CCCD của người đại diện pháp luật</label>
                      <input
                        type="text"
                        value={cccdNumber}
                        onChange={e => setCccdNumber(e.target.value)}
                        placeholder="Nhập số CCCD gồm 12 số"
                        className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* CCCD Front */}
                      <div>
                        <span className="block text-[#8a7e75] mb-2 uppercase text-[10px]">Ảnh CCCD Mặt trước</span>
                        <label className="cursor-pointer bg-white hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl p-4 flex flex-col items-center justify-center transition-colors min-h-[100px] relative overflow-hidden">
                          <input type="file" accept=".png,.jpg,.jpeg" disabled={kycVerifying || !!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'cccdFront')} />
                          {uploadingField === 'cccdFront' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1.5 z-20">
                              <span className="w-5 h-5 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              <span className="text-[8px] font-bold text-[#fa7150] uppercase tracking-wider">Đang tải...</span>
                            </div>
                          )}
                          {cccdFrontUrl ? (
                            <img src={cccdFrontUrl} className="max-h-20 rounded-lg object-contain" />
                          ) : (
                            <>
                              <Camera size={20} className="text-[#fa7150] mb-1" />
                              <span className="text-[9px] uppercase text-gray-500">Mặt trước CCCD</span>
                            </>
                          )}
                        </label>
                      </div>
                      {/* CCCD Back */}
                      <div>
                        <span className="block text-[#8a7e75] mb-2 uppercase text-[10px]">Ảnh CCCD Mặt sau</span>
                        <label className="cursor-pointer bg-white hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl p-4 flex flex-col items-center justify-center transition-colors min-h-[100px] relative overflow-hidden">
                          <input type="file" accept=".png,.jpg,.jpeg" disabled={kycVerifying || !!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'cccdBack')} />
                          {uploadingField === 'cccdBack' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1.5 z-20">
                              <span className="w-5 h-5 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              <span className="text-[8px] font-bold text-[#fa7150] uppercase tracking-wider">Đang tải...</span>
                            </div>
                          )}
                          {cccdBackUrl ? (
                            <img src={cccdBackUrl} className="max-h-20 rounded-lg object-contain" />
                          ) : (
                            <>
                              <Camera size={20} className="text-[#fa7150] mb-1" />
                              <span className="text-[9px] uppercase text-gray-500">Mặt sau CCCD</span>
                            </>
                          )}
                        </label>
                      </div>
                      {/* Selfie */}
                      <div>
                        <span className="block text-[#8a7e75] mb-2 uppercase text-[10px]">Ảnh chân dung (Selfie)</span>
                        <div className="bg-white border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150]/40 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[110px] space-y-2 transition-colors relative overflow-hidden">
                          {uploadingField === 'selfie' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1.5 z-20">
                              <span className="w-5 h-5 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              <span className="text-[8px] font-bold text-[#fa7150] uppercase tracking-wider">Đang tải...</span>
                            </div>
                          )}
                          {selfieUrl ? (
                            <div className="relative group w-full flex justify-center">
                              <img src={selfieUrl} className="max-h-20 rounded-lg object-contain" />
                              <button 
                                type="button"
                                onClick={() => { setSelfieUrl(''); setSelfieFile(null); }}
                                disabled={kycVerifying || !!uploadingField}
                                className="absolute top-0 right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 transition-colors shadow-sm disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Camera size={20} className="text-[#fa7150]" />
                              <div className="flex gap-2 w-full mt-1.5">
                                <label className="flex-1 py-1.5 bg-[#faf9f6] hover:bg-[#fa7150]/5 border border-[#e5d8d0] hover:border-[#fa7150] rounded-xl text-[9px] font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-1">
                                  <input type="file" accept=".png,.jpg,.jpeg" disabled={kycVerifying || !!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'selfie')} />
                                  Tải file
                                </label>
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  disabled={kycVerifying || !!uploadingField}
                                  className="flex-1 py-1.5 bg-[#fa7150] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-[9px] font-black uppercase text-center cursor-pointer transition-all flex items-center justify-center gap-1 hover:scale-[1.02] hover:bg-[#a43e24]"
                                >
                                  Mở Cam
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* eKYC Verification Trigger */}
                    <div className="pt-3 border-t border-[#e5d8d0]/60 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="text-left">
                        {isKycVerified ? (
                          <p className="text-emerald-700 text-[10px] font-black flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                            ✓ XÁC THỰC THÀNH CÔNG VỚI VNPT eKYC
                          </p>
                        ) : kycError ? (
                          <p className="text-rose-600 text-[10px] font-black">
                            ✗ Lỗi eKYC: {kycError}
                          </p>
                        ) : (
                          <p className="text-[#8a7e75] text-[10px] font-bold">
                            Tải lên đủ 3 ảnh trên rồi nhấn "Xác thực danh tính (eKYC)".
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyKyc}
                        disabled={kycVerifying || !cccdFrontFile || !cccdBackFile || !selfieFile}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#303330] hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl cursor-pointer transition-colors shadow-sm text-[10px] uppercase tracking-wider font-black flex items-center justify-center gap-1.5"
                      >
                        {kycVerifying ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Đang xử lý eKYC...</span>
                          </>
                        ) : (
                          'Xác thực danh tính (eKYC)'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-4">
                    <span className="text-[10px] text-[#fa7150] uppercase tracking-wider block mb-1">Giấy chứng nhận đăng ký kinh doanh & hành nghề</span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Business license */}
                      <div>
                        <span className="block text-[#8a7e75] mb-2 uppercase text-[10px]">Giấy phép Đăng ký kinh doanh / MST</span>
                        <label className="cursor-pointer bg-white hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl p-4 flex flex-col items-center justify-center transition-colors min-h-[100px] relative overflow-hidden">
                          <input type="file" accept=".png,.jpg,.jpeg,.pdf" disabled={kycVerifying || !!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'businessLicense')} />
                          {uploadingField === 'businessLicense' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1.5 z-20">
                              <span className="w-5 h-5 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              <span className="text-[8px] font-bold text-[#fa7150] uppercase tracking-wider">Đang tải...</span>
                            </div>
                          )}
                          {businessLicenseUrl ? (
                            <div className="text-center">
                              <FileText size={24} className="text-[#fa7150] mx-auto mb-1" />
                              <span className="text-[8px] text-gray-600 block truncate max-w-[120px]">{businessLicenseUrl.split('/').pop()}</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={20} className="text-[#fa7150] mb-1" />
                              <span className="text-[9px] uppercase text-gray-500">Đính kèm Ảnh/PDF</span>
                            </>
                          )}
                        </label>
                      </div>
                      {/* Vet certificate */}
                      <div>
                        <span className="block text-[#8a7e75] mb-2 uppercase text-[10px]">Chứng chỉ hành nghề thú y (Nếu có)</span>
                        <label className="cursor-pointer bg-white hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl p-4 flex flex-col items-center justify-center transition-colors min-h-[100px] relative overflow-hidden">
                          <input type="file" accept=".png,.jpg,.jpeg,.pdf" disabled={kycVerifying || !!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'vetCert')} />
                          {uploadingField === 'vetCert' && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1.5 z-20">
                              <span className="w-5 h-5 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              <span className="text-[8px] font-bold text-[#fa7150] uppercase tracking-wider">Đang tải...</span>
                            </div>
                          )}
                          {vetCertUrl ? (
                            <div className="text-center">
                              <FileText size={24} className="text-[#fa7150] mx-auto mb-1" />
                              <span className="text-[8px] text-gray-600 block truncate max-w-[120px]">{vetCertUrl.split('/').pop()}</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={20} className="text-[#fa7150] mb-1" />
                              <span className="text-[9px] uppercase text-gray-500">Đính kèm Ảnh/PDF</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {uploadingField && <p className="text-[9px] text-[#fa7150] font-bold animate-pulse text-right">Đang tải tài liệu lên hệ thống...</p>}

                  {/* Chuyển bước */}
                  <div className="flex justify-between gap-3 pt-4 border-t border-[#e5d8d0]/60">
                    <button type="button" onClick={() => setWizardStep(1)} className="px-5 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer">Quay lại bước 1</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isKycVerified) {
                          alert('Vui lòng hoàn tất xác thực danh tính điện tử (eKYC) trước khi tiếp tục.')
                          return
                        }
                        if (!cccdNumber.trim()) {
                          alert('Vui lòng điền Số CCCD người đại diện pháp luật trước khi tiếp tục.')
                          return
                        }
                        setWizardStep(3)
                      }}
                      className="px-6 py-3 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md"
                    >
                      Tiếp tục bước 3
                    </button>
                  </div>
                </div>
              )}

              {/* ── BƯỚC 3: THÔNG TIN TÀI KHOẢN NGÂN HÀNG ── */}
              {wizardStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-[#faf9f6] p-6 rounded-2xl border border-[#e5d8d0]/60 space-y-4">
                    <div className="flex items-center gap-2 text-[#a43e24]">
                      <ShieldAlert size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Thông tin tài khoản đối soát doanh thu</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên ngân hàng thụ hưởng</label>
                        <select
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                        >
                          <option value="Techcombank">Techcombank (Tập đoàn Kỹ thương)</option>
                          <option value="Vietcombank">Vietcombank (Ngoại thương)</option>
                          <option value="MBBank">MBBank (Quân đội)</option>
                          <option value="BIDV">BIDV (Đầu tư & Phát triển)</option>
                          <option value="ACB">ACB (Á Châu)</option>
                          <option value="Sacombank">Sacombank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#8a7e75] mb-1.5 uppercase">Số tài khoản ngân hàng</label>
                        <input
                          type="text"
                          required
                          value={bankAccountNumber}
                          onChange={e => setBankAccountNumber(e.target.value)}
                          placeholder="Ví dụ: 1903456789001"
                          className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên chủ tài khoản</label>
                      <input
                        type="text"
                        required
                        value={bankAccountName}
                        onChange={e => setBankAccountName(e.target.value)}
                        placeholder="VIẾT HOA KHÔNG DẤU, ví dụ: NGUYEN VAN A"
                        className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none"
                      />
                      <p className="text-[9px] text-[#8a7e75] mt-1.5 font-normal">
                        * Chú ý: Tên chủ tài khoản ngân hàng thụ hưởng nên trùng khớp hoàn toàn với tên đại diện pháp luật trên Căn cước công dân và Giấy chứng nhận kinh doanh để đối soát rút tiền.
                      </p>
                    </div>
                  </div>

                  {/* Chuyển bước & Gửi hồ sơ */}
                  <div className="flex justify-between gap-3 pt-4 border-t border-[#e5d8d0]/60">
                    <button type="button" onClick={() => setWizardStep(2)} className="px-5 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer">Quay lại bước 2</button>
                    <button
                      type="submit"
                      disabled={isAddingHotel}
                      className="px-6 py-3 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAddingHotel ? 'Đang gửi hồ sơ...' : 'Hoàn tất & Gửi duyệt'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-center">
            <h4 className="text-sm font-black text-[#303330] mb-4 uppercase tracking-wider">Chụp ảnh Selfie xác thực</h4>
            
            {/* Viewport */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-6 border border-[#e5d8d0]">
              <video
                id="webcam-video"
                autoPlay
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Guidelines overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-[#fa7150]/40 rounded-2xl pointer-events-none m-4 flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-2 border-dashed border-[#fa7150]/55"></div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] text-[#5a5550] rounded-xl font-bold text-xs uppercase transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-3 bg-[#fa7150] hover:bg-[#a43e24] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Camera size={14} /> Chụp ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
