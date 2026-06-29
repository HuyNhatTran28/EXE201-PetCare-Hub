import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cleanAddressDisplay } from '@/utils/cleanAddress'
import { maskAccountNumber } from '@/utils/maskAccountNumber'
import {
  PawPrint, Star,
  Settings, PlusCircle, MapPin, ListOrdered,
  TrendingUp, Building, DollarSign,
  Mail, MessageSquare, Save, Edit, Camera, Sparkles, QrCode, FileText, Download, Printer, ShieldAlert, Upload, Trash2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'
import { Map } from '@/components/Map'

interface HotelType {
  id: string
  name: string
  address: string
  status: string
  averageRating: number
  imageUrls?: string[]
  googleMapsUrl?: string
  description?: string
  rejectionReason?: string
}

const normalizeAddressString = (str: string) => {
  return str
    .toLowerCase()
    .replace(/^(phường\/xã|quận\/huyện|phường|xã|thị trấn|quận|huyện|thành phố|tỉnh|tp\.|tp|q\.|q|p\.|p)\s*/i, '')
    .replace(/\s+/g, '')
    .trim();
};

const getCleanStreet = (street: string, ward: string, district: string, province: string) => {
  let clean = street.trim();
  if (!clean) return '';

  const normWard = normalizeAddressString(ward);
  const normDistrict = normalizeAddressString(district);
  const normProvince = normalizeAddressString(province);

  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);

  while (parts.length > 0) {
    const lastPart = normalizeAddressString(parts[parts.length - 1]);
    if (
      lastPart === normProvince ||
      lastPart === normDistrict ||
      lastPart === normWard ||
      lastPart === 'hồchíminh' ||
      lastPart === 'hcm' ||
      lastPart === 'tphcm' ||
      !lastPart
    ) {
      parts.pop();
    } else {
      break;
    }
  }

  return parts.join(', ');
};

const formatAddressComponent = (val: string, prefixDefault: string) => {
  let trimmed = val.trim();
  if (!trimmed || trimmed === '—') return '';

  // Clean bulky "Phường/Xã" or "Quận/Huyện" prefixes
  trimmed = trimmed.replace(/^(phường\/xã|phường\/ xã|phường \/ xã)\s*/i, '');
  trimmed = trimmed.replace(/^(quận\/huyện|quận\/ huyện|quận \/ huyện)\s*/i, '');
  trimmed = trimmed.trim();

  // Normalize shorthands & duplicates
  if (prefixDefault === 'Quận') {
    trimmed = trimmed.replace(/^quận\s+quận\s+/i, 'Quận ');
    trimmed = trimmed.replace(/^quận\s+q\.?\s*(\d+)/i, 'Quận $1');
    trimmed = trimmed.replace(/^q\.?\s*(\d+)/i, 'Quận $1');
  } else if (prefixDefault === 'Phường') {
    trimmed = trimmed.replace(/^phường\s+phường\s+/i, 'Phường ');
    trimmed = trimmed.replace(/^phường\s+p\.?\s*(\d+)/i, 'Phường $1');
    trimmed = trimmed.replace(/^p\.?\s*(\d+)/i, 'Phường $1');
  }

  const normalized = trimmed.toLowerCase();
  const hasPrefix =
    normalized.startsWith('phường ') ||
    normalized.startsWith('p. ') ||
    normalized.startsWith('p.') ||
    normalized.startsWith('xã ') ||
    normalized.startsWith('thị trấn ') ||
    normalized.startsWith('quận ') ||
    normalized.startsWith('q. ') ||
    normalized.startsWith('q.') ||
    normalized.startsWith('huyện ') ||
    normalized.startsWith('thị xã ') ||
    normalized.startsWith('thành phố ') ||
    normalized.startsWith('tp. ') ||
    normalized.startsWith('tp.');

  if (hasPrefix) {
    return trimmed;
  }

  return `${prefixDefault} ${trimmed}`;
};

const cleanFormalPrefixes = (str: string, pattern: RegExp) => {
  let prev = '';
  let current = str.trim();
  while (current !== prev) {
    prev = current;
    current = current.replace(pattern, '').trim();
  }
  return current;
};

export const PartnerDashboard = () => {
  const { user } = useAuthStore()
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
  const [activeTab, setActiveTab] = useState<'hotels' | 'analytics' | 'bookings' | 'paperless' | 'settings' | 'finance'>(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab') as any
    if (tab) {
      setActiveTab(tab)
    } else {
      setActiveTab('hotels')
    }
  }, [searchParams])

  // Đăng ký khách sạn mới qua API thật
  const [showAddHotelModal, setShowAddHotelModal] = useState(false)

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

  // Tiện nghi bổ sung
  const [amenityGarden, setAmenityGarden] = useState(false)
  const [amenityAC, setAmenityAC] = useState(false)
  const [amenityCamera, setAmenityCamera] = useState(false)

  const [petTarget, setPetTarget] = useState<'DOG_ONLY' | 'CAT_ONLY' | 'BOTH'>('BOTH')
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('20:00')

  const [logoUrl, setLogoUrl] = useState('')
  const [frontUrl, setFrontUrl] = useState('')
  const [roomsUrl, setRoomsUrl] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [lat, setLat] = useState(10.7769)
  const [lng, setLng] = useState(106.7009)

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
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)

  // Finance states
  const [banks, setBanks] = useState<any[]>([])
  const [wallet, setWallet] = useState<{ balance: number; pendingBalance: number }>({ balance: 0, pendingBalance: 0 })
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBank, setWithdrawBank] = useState('')
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('')
  const [withdrawAccountName, setWithdrawAccountName] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const STATIC_BANKS = [
    { code: 'TCB', name: 'Techcombank', bin: '970407', shortName: 'Techcombank' },
    { code: 'VCB', name: 'Vietcombank', bin: '970436', shortName: 'Vietcombank' },
    { code: 'MB', name: 'MBBank', bin: '970422', shortName: 'MBBank' },
    { code: 'BIDV', name: 'BIDV', bin: '970418', shortName: 'BIDV' },
    { code: 'ACB', name: 'ACB', bin: '970416', shortName: 'ACB' },
    { code: 'STB', name: 'Sacombank', bin: '970403', shortName: 'Sacombank' },
    { code: 'CTG', name: 'VietinBank', bin: '970415', shortName: 'VietinBank' }
  ]

  const validateImageFile = (file: File): { isValid: boolean; message: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Chỉ chấp nhận các tệp ảnh .jpg, .jpeg, .png, .webp, .avif, .gif.`
      };
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        message: `Định dạng tệp "${file.name}" không hợp lệ. Vui lòng chọn ảnh JPEG, PNG, WEBP, AVIF hoặc GIF.`
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
    if (['logo', 'front', 'rooms', 'cccdFront', 'cccdBack', 'selfie', 'hotelGallery'].includes(fieldKey)) {
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
        case 'hotelGallery': setHotelImages(prev => [...prev, url]); break;
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
      const cleanStreet = getCleanStreet(hotelStreet, hotelWard, hotelDistrict, hotelProvince)
      const formattedWard = formatAddressComponent(hotelWard, 'Phường')
      const formattedDistrict = formatAddressComponent(hotelDistrict, 'Quận')
      const fullAddress = [
        cleanStreet,
        formattedWard,
        formattedDistrict,
        hotelProvince
      ].filter(Boolean).join(', ')

      // Compile selected services
      const selectedServices: string[] = []
      if (serviceBoarding) selectedServices.push('Pet Boarding')
      if (serviceGrooming) selectedServices.push('Grooming & Spa')
      if (serviceVet) selectedServices.push('Veterinary')
      if (serviceShop) selectedServices.push('Pet Shop')
      if (serviceOther) selectedServices.push('Other Services')

      // Compile selected amenities
      if (amenityGarden) selectedServices.push('Private Garden')
      if (amenityAC) selectedServices.push('Điều hòa (AC)')
      if (amenityCamera) selectedServices.push('Camera 24/7')
      // Compile description JSON (ảnh & thông tin cơ sở — pháp lý/ngân hàng không thu tại đây)
      const extraInfo = {
        petTarget,
        logoUrl,
        frontUrl,
        roomsUrl,
        imageUrls: hotelImages,
      }

      const payload = {
        name: newHotelName,
        address: fullAddress,
        locationLat: lat,
        locationLong: lng,
        googleMapsUrl: googleMapsUrl,
        description: JSON.stringify(extraInfo),
        amenities: selectedServices,
        checkInTime: openTime,
        checkOutTime: closeTime
      }

      if (editingHotelId) {
        await axiosInstance.put(`/api/hotels/${editingHotelId}`, payload)
        alert('Cập nhật thông tin khách sạn thành công!')
      } else {
        await axiosInstance.post('/api/hotels', payload)
        alert('Gửi hồ sơ đăng ký khách sạn thành công, vui lòng chờ hệ thống phê duyệt.')
      }

      // Reset state
      setNewHotelName('')
      setHotelStreet('')
      setHotelWard('')
      setHotelDistrict('')
      setHotelProvince('Thành phố Hồ Chí Minh')
      setLogoUrl('')
      setFrontUrl('')
      setRoomsUrl('')
      setHotelImages([])
      setGoogleMapsUrl('')
      setLat(10.7769)
      setLng(106.7009)
      setCccdNumber('')
      setCccdFrontUrl('')
      setCccdBackUrl('')
      setBusinessLicenseUrl('')
      setVetCertUrl('')
      setBankAccountNumber('')
      setBankAccountName('')
      setAmenityGarden(false)
      setAmenityAC(false)
      setAmenityCamera(false)
      setShowAddHotelModal(false)
      setEditingHotelId(null)
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to save hotel', error)
      let errorMessage = 'Không thể đăng ký. Vui lòng thử lại.'
      if (error.response) {
        const data = error.response.data
        if (data) {
          if (data.errors && typeof data.errors === 'object') {
            const detailMsgs = Object.entries(data.errors)
              .map(([field, msg]) => `- ${msg}`)
              .join('\n')
            errorMessage = `Đăng ký thất bại (Dữ liệu không hợp lệ):\n${detailMsgs}`
          } else if (data.message) {
            errorMessage = `Đăng ký thất bại: ${data.message}`
          } else {
            errorMessage = `Đăng ký thất bại (Mã lỗi: ${error.response.status}). Vui lòng thử lại.`
          }
        }
      } else if (error.request) {
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem server Backend đang chạy và cổng cấu hình đúng chưa!'
      } else {
        errorMessage = `Lỗi hệ thống: ${error.message}`
      }
      alert(errorMessage)
    } finally {
      setIsAddingHotel(false)
    }
  }

  const handleOpenNewHotelModal = () => {
    setEditingHotelId(null)
    setNewHotelName('')
    setHotelStreet('')
    setHotelWard('')
    setHotelDistrict('')
    setHotelProvince('Thành phố Hồ Chí Minh')
    setLogoUrl('')
    setFrontUrl('')
    setRoomsUrl('')
    setHotelImages([])
    setGoogleMapsUrl('')
    setLat(10.7769)
    setLng(106.7009)
    setCccdNumber('')
    setCccdFrontUrl('')
    setCccdBackUrl('')
    setBusinessLicenseUrl('')
    setVetCertUrl('')
    setBankAccountNumber('')
    setBankAccountName('')
    setAmenityGarden(false)
    setAmenityAC(false)
    setAmenityCamera(false)
    setShowAddHotelModal(true)
  }

  const handleStartEditHotel = (hotel: any) => {
    setEditingHotelId(hotel.id)
    setNewHotelName(hotel.name)
    setGoogleMapsUrl(hotel.googleMapsUrl || '')
    setLat(hotel.locationLat || 10.7769)
    setLng(hotel.locationLong || 106.7009)
    setOpenTime(hotel.checkInTime || '08:00')
    setCloseTime(hotel.checkOutTime || '20:00')

    // Parse address: "${street}, Phường/Xã ${ward}, Quận/Huyện ${district}, ${province}"
    let rawAddress = hotel.address || ''
    let street = rawAddress
    let ward = ''
    let district = ''
    let province = 'Thành phố Hồ Chí Minh'

    const addrParts = rawAddress.split(',').map((p: string) => p.trim()).filter(Boolean)
    if (addrParts.length >= 4) {
      province = addrParts[addrParts.length - 1]
      district = addrParts[addrParts.length - 2]
      ward = addrParts[addrParts.length - 3]
      street = addrParts.slice(0, addrParts.length - 3).join(', ')
    } else if (addrParts.length === 3) {
      province = addrParts[2]
      district = addrParts[1]
      street = addrParts[0]
    }

    // Clean formal prefixes "Phường/Xã ", "Quận/Huyện " recursively
    ward = cleanFormalPrefixes(ward, /^(phường\/xã|phường\/ xã|phường \/ xã)\s*/i)
    district = cleanFormalPrefixes(district, /^(quận\/huyện|quận\/ huyện|quận \/ huyện)\s*/i)

    // Self-heal and clean street address if it contains duplicate trailing components
    street = getCleanStreet(street, ward, district, province)

    setHotelStreet(street)
    setHotelWard(ward)
    setHotelDistrict(district)
    setHotelProvince(province)

    // Set checkboxed amenities/services
    const am = hotel.amenities || []
    setServiceBoarding(am.includes('Pet Boarding'))
    setServiceGrooming(am.includes('Grooming & Spa'))
    setServiceVet(am.includes('Veterinary'))
    setServiceShop(am.includes('Pet Shop'))
    setServiceOther(am.includes('Other Services'))

    // Set amenities
    setAmenityGarden(am.includes('Private Garden'))
    setAmenityAC(am.includes('Điều hòa (AC)'))
    setAmenityCamera(am.includes('Camera 24/7'))

    // Find fallback banking / KYC details from other hotels of this partner
    let fallbackCccd = ''
    let fallbackCccdFront = ''
    let fallbackCccdBack = ''
    let fallbackLicense = ''
    let fallbackVetCert = ''
    let fallbackBank = 'Techcombank'
    let fallbackAccNum = ''
    let fallbackAccName = ''

    for (const h of hotels) {
      if (h.description && h.description.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(h.description)
          if (parsed.cccd?.number && !fallbackCccd) {
            fallbackCccd = parsed.cccd.number
            fallbackCccdFront = parsed.cccd.frontUrl || ''
            fallbackCccdBack = parsed.cccd.backUrl || ''
          }
          if (parsed.legal?.businessLicenseUrl && !fallbackLicense) {
            fallbackLicense = parsed.legal.businessLicenseUrl
            fallbackVetCert = parsed.legal.vetCertUrl || ''
          }
          if (parsed.banking?.accountNumber && !fallbackAccNum) {
            fallbackBank = parsed.banking.bankName || 'Techcombank'
            fallbackAccNum = parsed.banking.accountNumber
            fallbackAccName = parsed.banking.accountName || ''
          }
        } catch { }
      }
    }

    // Parse description JSON containing logo, front, cccd, banking, etc.
    try {
      const desc = hotel.description
      if (desc && desc.trim().startsWith('{')) {
        const extra = JSON.parse(desc)
        setLogoUrl(extra.logoUrl || '')
        setFrontUrl(Array.isArray(extra.frontUrl) ? (extra.frontUrl[0] || '') : (extra.frontUrl || ''))
        setRoomsUrl(Array.isArray(extra.roomsUrl) ? (extra.roomsUrl[0] || '') : (extra.roomsUrl || ''))
        setHotelImages(extra.imageUrls || [])
        setPetTarget(extra.petTarget || 'BOTH')

        setCccdNumber(extra.cccd?.number || fallbackCccd)
        setCccdFrontUrl(extra.cccd?.frontUrl || fallbackCccdFront)
        setCccdBackUrl(extra.cccd?.backUrl || fallbackCccdBack)

        setBusinessLicenseUrl(extra.legal?.businessLicenseUrl || fallbackLicense)
        setVetCertUrl(extra.legal?.vetCertUrl || fallbackVetCert)

        setBankName(extra.banking?.bankName || fallbackBank)
        setBankAccountNumber(extra.banking?.accountNumber || fallbackAccNum)
        setBankAccountName(extra.banking?.accountName || fallbackAccName)
        setIsKycVerified(true)
      } else {
        setLogoUrl('')
        setFrontUrl('')
        setRoomsUrl('')
        setHotelImages([])
        setPetTarget('BOTH')
        setCccdNumber(fallbackCccd)
        setCccdFrontUrl(fallbackCccdFront)
        setCccdBackUrl(fallbackCccdBack)
        setBusinessLicenseUrl(fallbackLicense)
        setVetCertUrl(fallbackVetCert)
        setBankName(fallbackBank)
        setBankAccountNumber(fallbackAccNum)
        setBankAccountName(fallbackAccName)
      }
    } catch (err) {
      console.error('Failed to parse hotel description JSON:', err)
    }

    setShowAddHotelModal(true)
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

  const handleResubmitHotel = async (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId)
    if (!hotel) return
    if (!window.confirm(`Gửi duyệt lại khách sạn "${hotel.name}"? Hồ sơ sẽ chuyển về trạng thái chờ admin xét duyệt.`)) return
    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/resubmit`)
      alert('Đã gửi duyệt lại thành công! Admin sẽ xem xét hồ sơ của bạn.')
      window.location.reload()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể gửi duyệt lại. Vui lòng thử lại.')
    }
  }

  // CRM dynamic states
  const [crmPets, setCrmPets] = useState<any[]>([])
  const [crmLoading, setCrmLoading] = useState(false)
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [petBookingHistory, setPetBookingHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Paperless state
  const [selectedCheckInBookingId, setSelectedCheckInBookingId] = useState<string>('')
  const [selectedCheckOutBookingId, setSelectedCheckOutBookingId] = useState<string>('')
  const [checkInHealth, setCheckInHealth] = useState('Khỏe mạnh, bình thường.')
  const [checkInPhotoUrl, setCheckInPhotoUrl] = useState('')
  const [isSigned, setIsSigned] = useState(false)
  const [usePoints, setUsePoints] = useState(false)
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
  const [settingsSubTab, setSettingsSubTab] = useState<'channels' | 'loyalty' | 'general' | 'staff' | 'equipment'>('channels')

  // Staff & Equipment states
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [staffForm, setStaffForm] = useState({ email: '', jobPosition: 'Lễ tân', shiftStatus: 'ACTIVE' })
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)

  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false)
  const [equipmentForm, setEquipmentForm] = useState({ name: '', quantity: 1, status: 'GOOD', lastMaintenance: '' })
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null)

  // Hotel registration multiple images
  const [hotelImages, setHotelImages] = useState<string[]>([])

  // Interactive Booking State
  const [bookingFilter, setBookingFilter] = useState('ALL')

  // Notification sandbox state
  const [showNotificationSandboxModal, setShowNotificationSandboxModal] = useState(false)
  const [sandboxChannel, setSandboxChannel] = useState<'SMS' | 'Zalo' | 'Email'>('Zalo')

  useEffect(() => {
    if (
      showAddHotelModal ||
      showCameraModal ||
      showAddStaffModal ||
      showAddEquipmentModal ||
      showNotificationSandboxModal
    ) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [
    showAddHotelModal,
    showCameraModal,
    showAddStaffModal,
    showAddEquipmentModal,
    showNotificationSandboxModal
  ])

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
          const activeHotels = hotelList.filter((h: any) => h.status === 'ACTIVE')
          const avgRating = activeHotels.length > 0
            ? activeHotels.reduce((sum: number, h: any) => sum + (h.averageRating || 0), 0) / activeHotels.length
            : 0

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

        // Auto-select first confirmed/checked-in booking for check-in/out tabs if not set
        const content = bRes.data.content || []
        const confirmed = content.filter((b: any) => b.status === 'CONFIRMED')
        if (confirmed.length > 0) {
          setSelectedCheckInBookingId(confirmed[0].id)
        }
        const checkedIn = content.filter((b: any) => b.status === 'CHECKED_IN')
        if (checkedIn.length > 0) {
          setSelectedCheckOutBookingId(checkedIn[0].id)
        }
      } catch (err) {
        console.error('Failed to load hotel calendar data', err)
      } finally {
        setCalendarLoading(false)
      }
    }

    if (activeTab === 'bookings' || activeTab === 'paperless') {
      fetchCalendarData()
    }
  }, [selectedHotelId, activeTab])

  // CRM fetch pets and booking history
  useEffect(() => {
    const fetchCrmPets = async () => {
      if (activeTab !== 'analytics') return
      setCrmLoading(true)
      try {
        const res = await axiosInstance.get('/api/partner/crm/pets')
        const petList = res.data || []
        setCrmPets(petList)
        if (petList.length > 0) {
          handleSelectCrmPet(petList[0])
        } else {
          setSelectedPet(null)
          setPetBookingHistory([])
        }
      } catch (err) {
        console.error('Failed to fetch CRM pets', err)
      } finally {
        setCrmLoading(false)
      }
    }
    fetchCrmPets()
  }, [activeTab])

  // Finance fetch wallet and banks
  useEffect(() => {
    if (activeTab === 'finance') {
      fetchWalletAndWithdrawals()
      fetchBanks()
    }
  }, [activeTab])

  const fetchWalletAndWithdrawals = async () => {
    try {
      const walletRes = await axiosInstance.get('/api/partner/wallet')
      setWallet(walletRes.data)

      const withdrawalsRes = await axiosInstance.get('/api/partner/withdrawals')
      setWithdrawals(withdrawalsRes.data)
    } catch (err) {
      console.error('Failed to fetch finance info:', err)
    }
  }

  const fetchBanks = async () => {
    try {
      const res = await fetch('https://api.vietqr.io/v2/banks')
      const data = await res.json()
      if (data.code === '00') {
        setBanks(data.data)
      } else {
        setBanks(STATIC_BANKS)
      }
    } catch (err) {
      console.error('Failed to fetch banks from VietQR:', err)
      setBanks(STATIC_BANKS)
    }
  }

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!withdrawAmount || !withdrawBank || !withdrawAccountNumber || !withdrawAccountName) {
      alert('Vui lòng điền đầy đủ thông tin rút tiền!')
      return
    }

    const amountNum = parseFloat(withdrawAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Số tiền rút phải lớn hơn 0!')
      return
    }

    if (amountNum > wallet.balance) {
      alert('Số dư khả dụng của bạn không đủ!')
      return
    }

    setIsWithdrawing(true)
    try {
      const selectedBankObj = banks.find(b => b.code === withdrawBank || b.shortName === withdrawBank || b.name === withdrawBank)
      const bankShortName = selectedBankObj ? (selectedBankObj.shortName || selectedBankObj.code || selectedBankObj.name) : withdrawBank

      await axiosInstance.post('/api/partner/withdraw', {
        amount: amountNum,
        bankName: bankShortName,
        bankAccountNumber: withdrawAccountNumber,
        bankAccountName: withdrawAccountName.toUpperCase()
      })

      alert('Gửi yêu cầu rút tiền thành công!')
      setWithdrawAmount('')
      fetchWalletAndWithdrawals()
    } catch (err: any) {
      console.error('Withdrawal failed:', err)
      alert('Lỗi: ' + (err.response?.data?.message || 'Không thể thực hiện yêu cầu rút tiền.'))
    } finally {
      setIsWithdrawing(false)
    }
  }

  const handleSelectCrmPet = async (pet: any) => {
    setSelectedPet(pet)
    setHistoryLoading(true)
    try {
      const res = await axiosInstance.get(`/api/partner/crm/pets/${pet.id}/bookings`)
      setPetBookingHistory(res.data || [])
    } catch (err) {
      console.error('Failed to fetch pet bookings history', err)
      setPetBookingHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Staff fetch list
  const fetchStaffList = async () => {
    if (!selectedHotelId) return
    setStaffLoading(true)
    try {
      const res = await axiosInstance.get(`/api/partner/staff/hotel/${selectedHotelId}`)
      setStaffList(res.data || [])
    } catch (err) {
      console.error('Failed to fetch staff list', err)
    } finally {
      setStaffLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'settings' && settingsSubTab === 'staff') {
      fetchStaffList()
    }
  }, [activeTab, settingsSubTab, selectedHotelId])

  // Equipment fetch list
  const fetchEquipmentList = async () => {
    if (!selectedHotelId) return
    setEquipmentLoading(true)
    try {
      const res = await axiosInstance.get(`/api/partner/equipments/hotel/${selectedHotelId}`)
      setEquipmentList(res.data || [])
    } catch (err) {
      console.error('Failed to fetch equipment list', err)
    } finally {
      setEquipmentLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'settings' && settingsSubTab === 'equipment') {
      fetchEquipmentList()
    }
  }, [activeTab, settingsSubTab, selectedHotelId])

  // Staff actions
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHotelId) return
    try {
      if (editingStaffId) {
        await axiosInstance.put(`/api/partner/staff/${editingStaffId}`, staffForm)
        alert('Cập nhật nhân viên thành công!')
      } else {
        await axiosInstance.post(`/api/partner/staff/hotel/${selectedHotelId}`, staffForm)
        alert('Thêm nhân viên thành công!')
      }
      setStaffForm({ email: '', jobPosition: 'Lễ tân', shiftStatus: 'ACTIVE' })
      setEditingStaffId(null)
      setShowAddStaffModal(false)
      fetchStaffList()
    } catch (err: any) {
      console.error('Failed to submit staff', err)
      alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!')
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhân viên này khỏi cơ sở?')) return
    try {
      await axiosInstance.delete(`/api/partner/staff/${staffId}`)
      alert('Đã xóa nhân viên khỏi hệ thống!')
      fetchStaffList()
    } catch (err: any) {
      console.error('Failed to delete staff', err)
      alert(err.response?.data?.message || 'Không thể xóa nhân viên.')
    }
  }

  // Equipment actions
  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHotelId) return
    try {
      if (editingEquipmentId) {
        await axiosInstance.put(`/api/partner/equipments/${editingEquipmentId}`, equipmentForm)
        alert('Cập nhật thiết bị thành công!')
      } else {
        await axiosInstance.post(`/api/partner/equipments/hotel/${selectedHotelId}`, equipmentForm)
        alert('Thêm thiết bị mới thành công!')
      }
      setEquipmentForm({ name: '', quantity: 1, status: 'GOOD', lastMaintenance: '' })
      setEditingEquipmentId(null)
      setShowAddEquipmentModal(false)
      fetchEquipmentList()
    } catch (err: any) {
      console.error('Failed to submit equipment', err)
      alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!')
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa thiết bị này?')) return
    try {
      await axiosInstance.delete(`/api/partner/equipments/${id}`)
      alert('Đã xóa thiết bị thành công!')
      fetchEquipmentList()
    } catch (err: any) {
      console.error('Failed to delete equipment', err)
      alert(err.response?.data?.message || 'Không thể xóa thiết bị.')
    }
  }

  // Real Check-in action
  const handleRealCheckIn = async () => {
    if (!selectedCheckInBookingId) {
      alert('Vui lòng chọn một đặt phòng để làm thủ tục check-in.')
      return
    }
    if (!isSigned) {
      alert('Vui lòng yêu cầu chủ sở hữu ký tên xác nhận.')
      return
    }
    try {
      await axiosInstance.patch(`/api/bookings/${selectedCheckInBookingId}/checkin`, null, {
        params: {
          checkinPhotoUrl: checkInPhotoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
          ownerSignatureUrl: 'https://example.com/signature.png'
        }
      })
      alert('Thủ tục Check-in đã hoàn thành thành công!')
      setIsSigned(false)
      setCheckInPhotoUrl('')
      setCheckInHealth('Khỏe mạnh, bình thường.')
      // Refresh list
      if (selectedHotelId) {
        const bRes = await axiosInstance.get(`/api/bookings/hotel/${selectedHotelId}`, {
          params: { page: 0, size: 150, sort: [] }
        })
        setBookings(bRes.data.content || [])
        const content = bRes.data.content || []
        const confirmed = content.filter((b: any) => b.status === 'CONFIRMED')
        setSelectedCheckInBookingId(confirmed.length > 0 ? confirmed[0].id : '')
        const checkedIn = content.filter((b: any) => b.status === 'CHECKED_IN')
        setSelectedCheckOutBookingId(checkedIn.length > 0 ? checkedIn[0].id : '')
      }
    } catch (err: any) {
      console.error('Check-in failed', err)
      alert(err.response?.data?.message || 'Check-in thất bại.')
    }
  }

  // Real Check-out action
  const handleRealCheckOut = async () => {
    if (!selectedCheckOutBookingId) {
      alert('Vui lòng chọn một đặt phòng để làm thủ tục check-out.')
      return
    }
    try {
      await axiosInstance.patch(`/api/bookings/${selectedCheckOutBookingId}/checkout`)
      alert('Thủ tục thanh toán và Check-out đã hoàn tất thành công!')
      setShowQrPay(false)
      // Refresh list
      if (selectedHotelId) {
        const bRes = await axiosInstance.get(`/api/bookings/hotel/${selectedHotelId}`, {
          params: { page: 0, size: 150, sort: [] }
        })
        setBookings(bRes.data.content || [])
        const content = bRes.data.content || []
        const confirmed = content.filter((b: any) => b.status === 'CONFIRMED')
        setSelectedCheckInBookingId(confirmed.length > 0 ? confirmed[0].id : '')
        const checkedIn = content.filter((b: any) => b.status === 'CHECKED_IN')
        setSelectedCheckOutBookingId(checkedIn.length > 0 ? checkedIn[0].id : '')
      }
    } catch (err: any) {
      console.error('Check-out failed', err)
      alert(err.response?.data?.message || 'Check-out thất bại.')
    }
  }

  // File upload specifically for check-in photo
  const handleCheckInPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      alert(validation.message)
      return
    }
    setUploadingField('checkinPhoto')
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setCheckInPhotoUrl(res.data.url)
    } catch (err) {
      console.error('Check-in photo upload failed', err)
      alert('Không thể tải ảnh lên. Vui lòng thử lại.')
    } finally {
      setUploadingField(null)
    }
  }

  // Calculate dynamic stats
  const totalRoomsCount = roomTypes.reduce((sum, rt) => sum + (rt.totalRooms || 0), 0)
  const checkedInBookingsCount = bookings.filter((b: any) => b.status === 'CHECKED_IN').length
  const occupancyRate = totalRoomsCount > 0 ? Math.round((checkedInBookingsCount / totalRoomsCount) * 100) : 0
  const walkInWaitCount = bookings.filter((b: any) => b.status === 'PENDING').length

  // Premium design tokens
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }
  const greenGradient = { background: 'linear-gradient(135deg, #44683b 0%, #2c4e24 100%)' }

  return (
    <>
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
            onClick={handleOpenNewHotelModal}
            style={orangeGradient}
            className="px-6 py-3.5 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer w-fit self-start lg:self-center"
          >
            <PlusCircle size={16} /> Đăng ký thêm cơ sở mới
          </button>
        </header>

        {/* Global Hotel Context Selector */}
        {hotels.length > 0 && activeTab !== 'hotels' && (
          <div className="flex items-center justify-between gap-4 bg-white border border-[#e5d8d0] rounded-2xl px-6 py-3.5 shadow-sm mb-8 text-left animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <Building size={18} className="text-[#fa7150]" />
              <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Chọn cơ sở quản lý:</span>
              <select
                value={selectedHotelId || ''}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-[#303330] focus:outline-none cursor-pointer hover:text-[#fa7150] transition-colors"
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-[#8a7e75] uppercase tracking-wider">
              <span>Trạng thái:</span>
              {(() => {
                const sel = hotels.find(h => h.id === selectedHotelId)
                if (!sel) return null
                const active = sel.status === 'ACTIVE'
                return (
                  <span className={`px-2.5 py-0.5 rounded-full ${active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {sel.status}
                  </span>
                )
              })()}
            </div>
          </div>
        )}

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
                  onClick={handleOpenNewHotelModal}
                  className="text-[#fa7150] font-black text-sm hover:underline cursor-pointer"
                >
                  Đăng ký cơ sở đầu tiên ngay →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {hotels.map((hotel) => {
                  const isActive = hotel.status === 'ACTIVE';
                  return (
                    <div
                      key={hotel.id}
                      className="bg-[#faf9f6]/40 border border-[#e5d8d0] rounded-3xl p-6 relative group overflow-hidden transition-all duration-300 hover:border-[#fa7150]/40 hover:bg-white hover:shadow-xl hover:shadow-[#fa7150]/2 flex flex-col md:flex-row gap-6"
                    >
                      {/* Bìa/Ảnh Khách Sạn Bên Trái */}
                      <div className="relative w-full md:w-56 h-40 shrink-0 overflow-hidden rounded-2xl bg-gray-50 border border-[#e5d8d0]/60">
                        {hotel.imageUrls && hotel.imageUrls.length > 0 ? (
                          <img
                            src={hotel.imageUrls[0]}
                            alt={hotel.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#8a7e75] gap-2">
                            <Building size={28} className="text-[#fa7150]/60" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#8a7e75]/85">Chưa có ảnh</span>
                          </div>
                        )}
                      </div>

                      {/* Nội dung chi tiết bên phải */}
                      <div className="flex-1 flex flex-col justify-between text-left">
                        <div>
                          {/* Dòng tên & badge trạng thái */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                            <h4 className="text-xl font-black text-[#303330] group-hover:text-[#fa7150] transition-colors">
                              {hotel.name}
                            </h4>
                            <span
                              className={`text-[9px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm border ${isActive
                                  ? 'bg-[#e3f4e1] text-[#2c4e24] border-[#d0fac0]'
                                  : hotel.status === 'PENDING'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : hotel.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-700 border-red-300'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                            >
                              {isActive ? 'Đang hoạt động'
                                : hotel.status === 'PENDING' ? 'Chờ duyệt'
                                  : hotel.status === 'REJECTED' ? 'Bị từ chối'
                                    : 'Tạm ngưng'}
                            </span>
                          </div>

                          {/* Địa chỉ */}
                          <p className="text-xs text-[#8a7e75] flex items-center gap-1.5 mb-3 leading-relaxed">
                            <MapPin size={13} className="text-[#fa7150] shrink-0" />
                            <span className="line-clamp-2">{cleanAddressDisplay(hotel.address)}</span>
                          </p>

                          {/* Lý do từ chối */}
                          {hotel.status === 'REJECTED' && hotel.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                              <p className="text-[9px] font-black text-red-500 uppercase tracking-wider mb-0.5">Lý do từ chối</p>
                              <p className="text-xs text-red-700">{hotel.rejectionReason}</p>
                            </div>
                          )}

                          {/* Đánh giá & Maps */}
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-[#f59e0b] font-black bg-white border border-[#e5d8d0] px-2.5 py-1 rounded-xl">
                              <Star size={14} fill="currentColor" />
                              <span className="text-[#303330]">{hotel.averageRating || 5.0}</span>
                            </div>
                            {hotel.googleMapsUrl ? (
                              <a
                                href={hotel.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#fa7150] hover:underline flex items-center gap-1.5 font-bold"
                              >
                                🗺️ Xem bản đồ
                              </a>
                            ) : (
                              <div className="text-[#8a7e75] text-[11px]">
                                Bán kính: <span className="font-bold text-[#303330]">50km</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Nút thao tác dưới cùng */}
                        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[#e5d8d0]/60">
                          <Link
                            to={`/partner/hotels/${hotel.id}/rooms`}
                            className="bg-white border border-[#e5d8d0] px-4 py-2.5 rounded-xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <Settings size={13} /> Cài đặt phòng
                          </Link>
                          <Link
                            to={`/partner/hotels/${hotel.id}/services`}
                            className="bg-white border border-[#e5d8d0] px-4 py-2.5 rounded-xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <ListOrdered size={13} /> Danh mục dịch vụ
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleStartEditHotel(hotel)}
                            className="bg-white border border-[#e5d8d0] px-4 py-2.5 rounded-xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit size={13} /> Chỉnh sửa cơ sở
                          </button>
                          {hotel.status === 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleResubmitHotel(hotel.id)}
                              className="px-4 py-2.5 rounded-xl text-center font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer border bg-[#fa7150]/10 border-[#fa7150]/30 text-[#fa7150] hover:bg-[#fa7150]/20"
                            >
                              Gửi duyệt lại
                            </button>
                          )}
                          {hotel.status !== 'PENDING' && hotel.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleToggleHotelStatus(hotel.id)}
                              className={`px-4 py-2.5 rounded-xl text-center font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer border ${isActive
                                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                  : 'bg-[#e3f4e1] border-[#d0fac0] text-[#2c4e24] hover:bg-[#d0fac0]/20'
                                }`}
                            >
                              {isActive ? 'Tạm Ngưng' : 'Kích Hoạt'}
                            </button>
                          )}
                        </div>
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
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${bookingFilter === stat
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
                  <span className="text-3xl font-black text-emerald-950">{occupancyRate}%</span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 mt-4 flex items-center gap-1">
                  <TrendingUp size={12} /> {occupancyRate > 0 ? `Tỷ lệ hoạt động thực tế` : `Chưa có phòng lưu trú hôm nay`}
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
                  <span className="text-3xl font-black text-rose-950">{walkInWaitCount} bé</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('paperless')}
                  className="mt-4 px-4 py-2.5 bg-[#a43e24] hover:bg-[#fa7150] text-white text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer w-fit"
                >
                  Xử lý ngay
                </button>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div
                onClick={() => setActiveTab('paperless')}
                className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors"
                style={cardShadow}
              >
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
        {activeTab === 'paperless' && (() => {
          const confirmedBookings = bookings.filter((b: any) => b.status === 'CONFIRMED')
          const checkedInBookings = bookings.filter((b: any) => b.status === 'CHECKED_IN')

          const currentCheckInBooking = bookings.find((b: any) => b.id === selectedCheckInBookingId)
          const currentCheckOutBooking = bookings.find((b: any) => b.id === selectedCheckOutBookingId)

          const selectedBookingForInvoice = currentCheckOutBooking || currentCheckInBooking || (bookings.length > 0 ? bookings[0] : null)

          // Determine banking details for VietQR
          let bankAccountNo = "1903456789001"
          let bankNameCode = "TCB"
          let bankAccountNameText = "PETCARE HUB PARTNER"
          const selectedHotel = hotels.find(h => h.id === selectedHotelId)
          if (selectedHotel && selectedHotel.description) {
            try {
              const extraInfo = JSON.parse(selectedHotel.description)
              if (extraInfo.banking) {
                bankAccountNo = extraInfo.banking.accountNumber || bankAccountNo
                const bName = (extraInfo.banking.bankName || "").toLowerCase()
                if (bName.includes("vietcombank")) bankNameCode = "VCB"
                else if (bName.includes("mbbank")) bankNameCode = "MB"
                else if (bName.includes("bidv")) bankNameCode = "BIDV"
                else if (bName.includes("acb")) bankNameCode = "ACB"
                else if (bName.includes("sacombank")) bankNameCode = "STB"
                else bankNameCode = "TCB"
                bankAccountNameText = extraInfo.banking.accountName || bankAccountNameText
              }
            } catch (e) {
              console.error("Failed to parse hotel description JSON", e)
            }
          }

          const checkoutRoomAmount = currentCheckOutBooking
            ? (currentCheckOutBooking.totalAmount - (currentCheckOutBooking.vatAmount || 0) - (currentCheckOutBooking.convenienceFee || 0) + (currentCheckOutBooking.voucherDiscountAmount || 0))
            : 0

          const finalCheckoutAmount = currentCheckOutBooking
            ? (usePoints ? Math.max(0, currentCheckOutBooking.totalAmount - 50000) : currentCheckOutBooking.totalAmount)
            : 0

          const handlePrintInvoice = () => {
            const printContent = document.getElementById('printable-invoice-content')?.innerHTML;
            if (!printContent) return;
            const windowUrl = 'about:blank';
            const uniqueName = new Date().getTime();
            const windowName = 'Print' + uniqueName;
            const printWindow = window.open(windowUrl, windowName, 'left=50,top=50,width=800,height=900');
            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head>
                    <title>In Hóa Đơn - ${selectedBookingForInvoice?.invoiceNumber}</title>
                    <style>
                      body { font-family: 'Inter', sans-serif; padding: 40px; color: #303330; }
                      .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 10px; }
                      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f0ece9; padding-bottom: 20px; margin-bottom: 20px; }
                      .title { font-size: 24px; font-weight: 900; color: #a43e24; }
                      .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                      .bold { font-weight: bold; }
                      .divider { height: 1px; border-top: 1px dashed #e5d8d0; margin: 20px 0; }
                      .total { font-size: 18px; font-weight: 950; color: #a43e24; }
                      @media print {
                        body { padding: 0; }
                        .invoice-box { border: none; padding: 0; }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="invoice-box">
                      ${printContent}
                    </div>
                    <script>
                      window.onload = function() {
                        window.print();
                        window.close();
                      }
                    </script>
                  </body>
                </html>
              `);
              printWindow.document.close();
            }
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
              {/* Column 1 & 2: Check-in / Check-out Workspace */}
              <div className="lg:col-span-2 bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-8" style={cardShadow}>
                <div className="flex justify-between items-center border-b border-[#e5d8d0]/60 pb-4">
                  <h3 className="text-2xl font-black text-[#303330]">Quy trình Không giấy tờ</h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#fa7150]/15 text-[#fa7150] rounded-full text-[10px] font-black uppercase">
                      {confirmedBookings.length} Chờ Check-in
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase">
                      {checkedInBookings.length} Đang lưu trú
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* 1. Check-in Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#a43e24] text-white flex items-center justify-center font-black text-xs">1</span>
                      <h4 className="text-base font-black text-[#303330]">Thủ tục Check-in</h4>
                    </div>

                    {/* Booking Select */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Chọn đơn check-in</label>
                      {confirmedBookings.length === 0 ? (
                        <p className="p-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-[10px] font-bold text-[#8a7e75]">Không có đơn nào chờ check-in hôm nay.</p>
                      ) : (
                        <select
                          value={selectedCheckInBookingId}
                          onChange={e => setSelectedCheckInBookingId(e.target.value)}
                          className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer text-xs font-bold"
                        >
                          {confirmedBookings.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.invoiceNumber} - Bé {b.pets?.map((p: any) => p.name).join(', ')} ({b.ownerName})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {currentCheckInBooking && (
                      <>
                        {/* Photo Capture Area */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Ảnh khi nhận thú cưng</label>
                          <label className="cursor-pointer h-40 bg-[#faf9f6]/60 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-3xl flex flex-col items-center justify-center gap-2 text-[#8a7e75] transition-colors relative overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={!!uploadingField}
                              onChange={handleCheckInPhotoUpload}
                            />
                            {uploadingField === 'checkinPhoto' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-6 h-6 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            {checkInPhotoUrl ? (
                              <img src={checkInPhotoUrl} className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Camera size={26} className="text-[#fa7150]" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Tải ảnh nhận bé</span>
                              </>
                            )}
                          </label>
                        </div>

                        {/* Health status notes */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Tình trạng Sức khỏe thực tế</label>
                          <textarea
                            value={checkInHealth}
                            onChange={e => setCheckInHealth(e.target.value)}
                            rows={2}
                            placeholder="Ghi chú vết thương, trạng thái tâm lý..."
                            className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl text-xs font-bold outline-none"
                          />
                        </div>

                        {/* Signature pad representation */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Chữ ký Xác nhận (Chủ sở hữu)</label>
                          <div className="h-24 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl relative flex items-center justify-center">
                            {isSigned ? (
                              <span className="text-[10px] font-black font-mono text-[#44683b] uppercase tracking-widest border-2 border-[#44683b] px-3 py-1 rounded-xl rotate-[-4deg]">
                                ✓ ĐÃ KÝ XÁC NHẬN
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setIsSigned(true); }}
                                className="px-4 py-2 border border-dashed border-[#fa7150] rounded-xl text-[#fa7150] text-[10px] font-black uppercase cursor-pointer"
                              >
                                Ký điện tử tại đây
                              </button>
                            )}
                            {isSigned && (
                              <button
                                type="button"
                                onClick={() => { setIsSigned(false); }}
                                className="absolute bottom-2 right-4 text-[9px] font-black text-[#a43e24] uppercase hover:underline cursor-pointer"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRealCheckIn}
                          style={orangeGradient}
                          className="w-full py-3.5 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-transform shadow-md shadow-[#fa7150]/10"
                        >
                          Xác nhận & Nhận thú cưng
                        </button>
                      </>
                    )}
                  </div>

                  {/* 2. Check-out Payment Section */}
                  <div className="space-y-6 border-t md:border-t-0 md:border-l border-[#e5d8d0]/60 md:pl-8">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#44683b] text-white flex items-center justify-center font-black text-xs">2</span>
                      <h4 className="text-base font-black text-[#303330]">Thanh toán Check-out</h4>
                    </div>

                    {/* Booking Select */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Chọn đơn check-out</label>
                      {checkedInBookings.length === 0 ? (
                        <p className="p-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-[10px] font-bold text-[#8a7e75]">Không có bé nào đang lưu trú chờ check-out.</p>
                      ) : (
                        <select
                          value={selectedCheckOutBookingId}
                          onChange={e => setSelectedCheckOutBookingId(e.target.value)}
                          className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer text-xs font-bold"
                        >
                          {checkedInBookings.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.invoiceNumber} - Bé {b.pets?.map((p: any) => p.name).join(', ')} ({b.ownerName})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {currentCheckOutBooking && (
                      <>
                        {/* Line items details */}
                        <div className="space-y-2.5 bg-[#faf9f6] p-4.5 rounded-2.5xl border border-[#e5d8d0]/60">
                          <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                            <span>Phòng {currentCheckOutBooking.roomTypeName} ({currentCheckOutBooking.totalNights} đêm)</span>
                            <span className="font-black text-[#303330]">{checkoutRoomAmount.toLocaleString('vi-VN')}đ</span>
                          </div>

                          {currentCheckOutBooking.voucherDiscountAmount > 0 && (
                            <div className="flex justify-between items-center text-xs font-bold text-rose-700">
                              <span>Voucher giảm giá</span>
                              <span className="font-black">-{currentCheckOutBooking.voucherDiscountAmount.toLocaleString('vi-VN')}đ</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                            <span>Phí tiện ích dịch vụ</span>
                            <span className="font-black text-[#303330]">{currentCheckOutBooking.convenienceFee?.toLocaleString('vi-VN')}đ</span>
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                            <span>Thuế VAT (8%)</span>
                            <span className="font-black text-[#303330]">{currentCheckOutBooking.vatAmount?.toLocaleString('vi-VN')}đ</span>
                          </div>

                          <div className="h-px bg-[#e5d8d0]/60 my-1.5" />
                          <div className="flex justify-between items-center text-xs font-bold text-[#303330]">
                            <span>Tổng tiền dự kiến</span>
                            <span className="text-[#a43e24] font-black text-sm">{currentCheckOutBooking.totalAmount?.toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>

                        {/* Points Loyalty Toggle */}
                        <div className="flex justify-between items-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                            <Sparkles size={12} /> Áp dụng 500 điểm (-50.000 VNĐ)
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usePoints}
                              onChange={e => setUsePoints(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#44683b]" />
                          </label>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-between items-center py-1">
                          <div>
                            <span className="text-[8px] font-black text-[#8a7e75] uppercase block">TỔNG THANH TOÁN THỰC TẾ</span>
                            <span className="text-2xl font-black text-[#303330]">{finalCheckoutAmount.toLocaleString('vi-VN')}đ</span>
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowQrPay(!showQrPay)}
                              className="px-4.5 py-3 bg-[#303330] text-white font-black text-[9px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 hover:bg-black transition-colors cursor-pointer"
                            >
                              <QrCode size={14} /> Quét VietQR
                            </button>

                            {showQrPay && (
                              <div className="absolute right-0 bottom-14 bg-white border border-[#e5d8d0] p-4 rounded-2.5xl shadow-2xl w-48 text-center animate-in fade-in zoom-in duration-200 z-10">
                                <span className="text-[9px] font-black uppercase text-[#8a7e75] block mb-2">Mã QR Chuyển khoản</span>
                                <img
                                  src={`https://img.vietqr.io/image/${bankNameCode}-${bankAccountNo}-compact2.png?amount=${finalCheckoutAmount}&addInfo=${currentCheckOutBooking.invoiceNumber}&accountName=${encodeURIComponent(bankAccountNameText)}`}
                                  className="w-32 h-32 mx-auto mb-2 border border-gray-100 rounded-lg"
                                />
                                <span className="text-[9px] font-bold text-gray-500 block mb-0.5">{bankNameCode} - {maskAccountNumber(bankAccountNo)}</span>
                                <span className="text-[10px] font-black text-[#a43e24] block">{finalCheckoutAmount.toLocaleString('vi-VN')}đ</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRealCheckOut}
                          style={greenGradient}
                          className="w-full py-3.5 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-transform shadow-md"
                        >
                          Xác nhận Đã thu tiền & Check-out
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: E-Invoice Preview */}
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col justify-between" style={cardShadow}>
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-[#e5d8d0]/40 pb-4">
                    <h3 className="text-base font-black text-[#303330] flex items-center gap-2">
                      <FileText size={18} className="text-[#fa7150]" />
                      Hóa đơn điện tử
                    </h3>
                  </div>

                  {selectedBookingForInvoice ? (
                    <div className="space-y-4.5 text-xs font-bold text-left">
                      <div className="flex justify-between">
                        <span className="text-[#8a7e75] uppercase text-[9px]">Mã Hóa đơn</span>
                        <span className="text-[#303330] font-black">{selectedBookingForInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8a7e75] uppercase text-[9px]">Khách hàng</span>
                        <span className="text-[#303330]">{selectedBookingForInvoice.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8a7e75] uppercase text-[9px]">Thú cưng</span>
                        <span className="text-[#303330] uppercase">
                          {selectedBookingForInvoice.pets?.map((p: any) => `${p.name} (${p.species === 'CAT' || p.species?.toLowerCase().includes('cat') ? 'Mèo' : 'Chó'})`).join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8a7e75] uppercase text-[9px]">Thời gian</span>
                        <span className="text-[#303330]">{selectedBookingForInvoice.checkInDate} - {selectedBookingForInvoice.checkOutDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8a7e75] uppercase text-[9px]">Hạng phòng</span>
                        <span className="text-[#303330]">{selectedBookingForInvoice.roomTypeName}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#e5d8d0]/60 pt-3">
                        <span className="text-[#303330] uppercase text-[10px] font-black">Tổng thanh toán</span>
                        <span className="text-[#a43e24] font-black text-sm">{selectedBookingForInvoice.totalAmount?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#8a7e75] font-bold py-12 text-center">Chọn một đặt lịch nghỉ dưỡng ở bên để xem chi tiết hóa đơn.</p>
                  )}
                </div>

                {selectedBookingForInvoice && (
                  <div className="pt-6 border-t border-[#e5d8d0]/60 mt-6 flex gap-3">
                    <button
                      onClick={() => alert('Đang tạo tệp PDF tải xuống...')}
                      className="flex-1 py-3 bg-[#f0ece9] text-[#5a5550] rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#e5d8d0] transition-colors cursor-pointer"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button
                      onClick={handlePrintInvoice}
                      className="flex-1 py-3 bg-[#303330] text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-black transition-colors cursor-pointer"
                    >
                      <Printer size={14} /> In nhanh
                    </button>
                  </div>
                )}
              </div>

              {/* Printable Invoice Container (Hidden from UI, used by printWindow) */}
              {selectedBookingForInvoice && (
                <div id="printable-invoice-content" className="hidden">
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0, fontWeight: 900, color: '#a43e24' }}>PETCARE HUB INVOICE</h2>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#8a7e75' }}>Hóa đơn thanh toán dịch vụ khách sạn thú cưng</p>
                  </div>
                  <div style={{ marginBottom: '20px', fontSize: '13px' }}>
                    <p style={{ margin: '5px 0' }}><strong>Cơ sở:</strong> {selectedBookingForInvoice.hotelName}</p>
                    <p style={{ margin: '5px 0' }}><strong>Mã hóa đơn:</strong> {selectedBookingForInvoice.invoiceNumber}</p>
                    <p style={{ margin: '5px 0' }}><strong>Khách hàng:</strong> {selectedBookingForInvoice.ownerName}</p>
                    <p style={{ margin: '5px 0' }}><strong>Thú cưng:</strong> {selectedBookingForInvoice.pets?.map((p: any) => p.name).join(', ')}</p>
                    <p style={{ margin: '5px 0' }}><strong>Thời gian lưu trú:</strong> {selectedBookingForInvoice.checkInDate} đến {selectedBookingForInvoice.checkOutDate} ({selectedBookingForInvoice.totalNights} đêm)</p>
                  </div>
                  <hr style={{ borderTop: '1px dashed #e5d8d0', margin: '20px 0' }} />
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Phòng {selectedBookingForInvoice.roomTypeName} ({selectedBookingForInvoice.totalNights} đêm)</span>
                      <span>{((selectedBookingForInvoice.totalAmount || 0) - (selectedBookingForInvoice.vatAmount || 0) - (selectedBookingForInvoice.convenienceFee || 0) + (selectedBookingForInvoice.voucherDiscountAmount || 0)).toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedBookingForInvoice.voucherDiscountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#a43e24' }}>
                        <span>Voucher giảm giá</span>
                        <span>-{selectedBookingForInvoice.voucherDiscountAmount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Phí tiện ích dịch vụ</span>
                      <span>{selectedBookingForInvoice.convenienceFee?.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Thuế VAT (8%)</span>
                      <span>{selectedBookingForInvoice.vatAmount?.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                  <hr style={{ borderTop: '1px solid #303330', margin: '20px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                    <span>TỔNG CỘNG THU</span>
                    <span style={{ color: '#a43e24' }}>{selectedBookingForInvoice.totalAmount?.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

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
                          className={`w-7 sm:w-9 rounded-t-lg transition-all duration-300 ${m.active
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
                  <h3 className="text-lg font-black text-[#303330]">Danh sách Hồ sơ Thú cưng (CRM)</h3>
                  <span className="text-xs font-black text-[#8a7e75] bg-[#faf9f6] border border-[#e5d8d0] px-3 py-1.5 rounded-full">
                    Tổng cộng: {crmPets.length} bé
                  </span>
                </div>

                {crmLoading ? (
                  <div className="py-12 text-center text-[#8a7e75] font-bold text-xs">
                    <span className="inline-block w-5 h-5 rounded-full border-2 border-[#fa7150]/20 border-t-[#fa7150] animate-spin mr-2"></span>
                    Đang tải danh sách thú cưng...
                  </div>
                ) : crmPets.length === 0 ? (
                  <p className="text-xs text-[#8a7e75] font-bold text-center py-12">Không tìm thấy hồ sơ thú cưng nào từng lưu trú tại cơ sở của bạn.</p>
                ) : (
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {crmPets.map((pet) => {
                      const isSelected = selectedPet?.id === pet.id
                      return (
                        <div
                          key={pet.id}
                          className={`p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isSelected
                              ? 'bg-[#fa7150]/5 border-[#fa7150] shadow-sm shadow-[#fa7150]/10'
                              : 'bg-[#faf9f6] border-[#e5d8d0]/60 hover:border-[#fa7150]/40'
                            }`}
                          onClick={() => handleSelectCrmPet(pet)}
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={pet.avatarUrl || getPetAvatar(pet.species)}
                              className="w-11 h-11 rounded-full object-cover border border-[#e5d8d0] shrink-0"
                            />
                            <div className="text-left leading-tight">
                              <span className="font-black text-sm text-[#303330] block">{pet.name}</span>
                              <span className="text-[10px] text-[#8a7e75] block mt-0.5">
                                {pet.breed || 'Không rõ giống'} • {pet.ageYears != null ? `${pet.ageYears} tuổi` : 'Không rõ tuổi'}
                              </span>
                              <span className="text-[9px] text-[#fa7150] font-black uppercase tracking-wider block mt-1">
                                Chủ: {pet.ownerName}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col gap-1 items-end">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${pet.isVaccinated
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                              {pet.isVaccinated ? 'Đã tiêm phòng' : 'Chưa tiêm phòng'}
                            </span>
                            <span className="text-[9px] text-[#8a7e75] font-mono block">
                              {pet.ownerPhone || '—'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column Profile Details */}
            {selectedPet && (
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 space-y-6 flex flex-col justify-between" style={cardShadow}>
                <div className="space-y-6">
                  {/* Pet Photo */}
                  <div className="relative rounded-2xl overflow-hidden h-40 bg-gray-50 border border-[#e5d8d0]/60">
                    <img
                      src={selectedPet.avatarUrl || getPetAvatar(selectedPet.species)}
                      alt={selectedPet.name}
                      className="w-full h-full object-cover"
                    />
                    <span className={`absolute top-3 right-3 border text-[9px] font-black uppercase px-3 py-1 rounded-full ${selectedPet.isVaccinated
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                      {selectedPet.isVaccinated ? 'Đầy đủ vaccine' : 'Thiếu vaccine'}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div className="border-b border-[#e5d8d0]/40 pb-4 text-left">
                    <h3 className="text-2xl font-black text-[#303330]">{selectedPet.name}</h3>
                    <p className="text-xs text-[#8a7e75] mt-1 font-bold">
                      {selectedPet.species === 'CAT' || selectedPet.species?.toLowerCase().includes('cat') ? '🐱 Mèo' : '🐶 Chó'} • {selectedPet.breed || 'Chưa rõ giống'} • {selectedPet.ageYears != null ? `${selectedPet.ageYears} tuổi` : 'Chưa rõ tuổi'} ({selectedPet.weightKg || '—'} kg)
                    </p>
                  </div>

                  {/* Contact details card (Masked) */}
                  <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/80 text-left space-y-1.5 text-[11px] font-bold text-[#5a5550]">
                    <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-wider block mb-1">Thông tin Chủ nuôi</span>
                    <div>Chủ sở hữu: <span className="text-[#303330] font-black">{selectedPet.ownerName}</span></div>
                    <div>Số điện thoại: <span className="text-[#303330] font-mono">{selectedPet.ownerPhone || '—'}</span></div>
                    <div>Email: <span className="text-[#303330] font-mono">{selectedPet.ownerEmail || '—'}</span></div>
                    {selectedPet.microchipId && <div>Mã chip: <span className="text-[#303330] font-mono">{selectedPet.microchipId}</span></div>}
                  </div>

                  {/* Special Care Rules */}
                  <div className="space-y-4 text-xs font-bold text-[#5a5550] text-left">
                    <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-wider block">Hướng dẫn Chăm sóc</span>

                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex gap-2 items-start">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-rose-800">Đặc tính / Hành vi</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">
                          {selectedPet.specialNotes || 'Thân thiện, hoạt bát, chưa có ghi chú đặc biệt.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex gap-2 items-start">
                      <PawPrint size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-emerald-800">Dinh dưỡng & Cho ăn</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">
                          {selectedPet.foodType || 'Thức ăn hạt thông thường'} • {selectedPet.feedingSchedule || '2 bữa/ngày (Sáng/Tối)'}
                        </p>
                      </div>
                    </div>

                    {selectedPet.personalityTags && selectedPet.personalityTags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {selectedPet.personalityTags.map((tag: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-[#fa7150]/10 border border-[#fa7150]/20 text-[#a43e24] text-[9px] font-black rounded-lg">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lịch sử đặt phòng timeline */}
                  <div className="space-y-4 pt-6 border-t border-[#e5d8d0]/60 text-left">
                    <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-wider block">Lịch sử nghỉ dưỡng tại cơ sở</span>
                    {historyLoading ? (
                      <div className="py-8 text-center text-xs text-[#8a7e75]">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-[#fa7150]/20 border-t-[#fa7150] animate-spin mr-2 align-middle"></span>
                        Đang tải lịch sử...
                      </div>
                    ) : petBookingHistory.length === 0 ? (
                      <p className="text-[10px] font-bold text-[#8a7e75] text-center py-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl">Chưa có lịch sử đặt phòng nào cho bé tại đây.</p>
                    ) : (
                      <div className="relative pl-4 border-l-2 border-[#e5d8d0] space-y-4 max-h-[300px] overflow-y-auto">
                        {petBookingHistory.map((b: any) => {
                          let statusColor = 'bg-gray-100 text-gray-800 border-gray-200'
                          if (b.status === 'COMPLETED') statusColor = 'bg-blue-50 text-blue-800 border-blue-200'
                          else if (b.status === 'CHECKED_IN') statusColor = 'bg-rose-50 text-rose-800 border-rose-200'
                          else if (b.status === 'CONFIRMED') statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          else if (b.status === 'CANCELLED') statusColor = 'bg-red-50 text-red-800 border-red-200'

                          return (
                            <div key={b.id} className="relative">
                              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white bg-[#fa7150] shadow-sm"></span>
                              <div className="leading-tight space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-black text-[11px] text-[#303330]">{b.invoiceNumber}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${statusColor}`}>{b.status}</span>
                                </div>
                                <span className="block text-[10px] text-[#8a7e75] font-bold">{b.hotelName} • {b.roomTypeName}</span>
                                <span className="block text-[9px] text-gray-500 font-mono">{b.checkInDate} đến {b.checkOutDate} ({b.totalNights} đêm)</span>
                                <span className="block text-[10px] text-[#a43e24] font-black">Tổng chi: {b.totalAmount?.toLocaleString('vi-VN')}đ</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert(`Đang cập nhật hồ sơ cho bé ${selectedPet.name}. Vui lòng thực hiện trên ứng dụng Khách hàng hoặc liên hệ Admin nếu cần chỉnh sửa đặc tính sinh học.`)}
                  className="w-full py-3.5 bg-[#303330] hover:bg-black text-white text-xs font-black uppercase rounded-full tracking-wider mt-6 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit size={14} /> Chỉnh sửa nhanh hồ sơ
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
                  className={`pb-2 px-3 text-xs font-black relative ${settingsSubTab === 'channels' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                    }`}
                >
                  Kênh Liên lạc
                </button>
                <button
                  onClick={() => setSettingsSubTab('loyalty')}
                  className={`pb-2 px-3 text-xs font-black relative ${settingsSubTab === 'loyalty' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                    }`}
                >
                  Khách hàng Thân thiết
                </button>
                <button
                  onClick={() => setSettingsSubTab('general')}
                  className={`pb-2 px-3 text-xs font-black relative ${settingsSubTab === 'general' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                    }`}
                >
                  Thông số Chung
                </button>
                <button
                  onClick={() => setSettingsSubTab('staff')}
                  className={`pb-2 px-3 text-xs font-black relative ${settingsSubTab === 'staff' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                    }`}
                >
                  Nhân sự
                </button>
                <button
                  onClick={() => setSettingsSubTab('equipment')}
                  className={`pb-2 px-3 text-xs font-black relative ${settingsSubTab === 'equipment' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                    }`}
                >
                  Trang thiết bị
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

              {/* Staff Management Panel */}
              {settingsSubTab === 'staff' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6 animate-fadeIn" style={cardShadow}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                        <Building size={18} className="text-[#fa7150]" />
                        Quản lý Nhân sự
                      </h3>
                      <p className="text-xs text-[#8a7e75] mt-1">Quản lý chức vụ, ca trực và phân quyền nhân viên cho cơ sở.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaffId(null);
                        setStaffForm({ email: '', jobPosition: 'Lễ tân', shiftStatus: 'ACTIVE' });
                        setShowAddStaffModal(true);
                      }}
                      style={orangeGradient}
                      className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                    >
                      + Thêm Nhân viên
                    </button>
                  </div>

                  {staffLoading ? (
                    <div className="py-12 text-center text-[#8a7e75] font-bold text-xs">
                      <span className="inline-block w-5 h-5 rounded-full border-2 border-[#fa7150]/20 border-t-[#fa7150] animate-spin mr-2"></span>
                      Đang tải danh sách nhân sự...
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-[#e5d8d0] rounded-2xl bg-[#faf9f6]/40 text-[#8a7e75] font-bold text-xs">
                      Chưa có nhân viên nào trong cơ sở. Thêm nhân viên bằng tài khoản email.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-[#faf9f6] border-b border-[#e5d8d0] text-[9px] font-black text-[#8a7e75] uppercase tracking-wider">
                            <th className="p-4 pl-6">Họ tên nhân viên</th>
                            <th className="p-4">Email liên lạc</th>
                            <th className="p-4">Chức vụ</th>
                            <th className="p-4">Trạng thái ca trực</th>
                            <th className="p-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5d8d0]/60 font-bold">
                          {staffList.map((st) => (
                            <tr key={st.id} className="hover:bg-[#faf9f6]/30">
                              <td className="p-4 pl-6 text-[#303330]">{st.fullName || '—'}</td>
                              <td className="p-4 text-[#8a7e75] font-mono">{st.email}</td>
                              <td className="p-4 text-[#303330]">{st.jobPosition}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${st.shiftStatus === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : st.shiftStatus === 'OFF_DUTY'
                                      ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                  {st.shiftStatus === 'ACTIVE' ? 'Đang làm việc' : st.shiftStatus === 'OFF_DUTY' ? 'Nghỉ ca' : 'Nghỉ phép'}
                                </span>
                              </td>
                              <td className="p-4 text-center flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStaffId(st.id);
                                    setStaffForm({ email: st.email, jobPosition: st.jobPosition, shiftStatus: st.shiftStatus });
                                    setShowAddStaffModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-[#fa7150]"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(st.id)}
                                  className="p-1.5 text-gray-500 hover:text-rose-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Equipment Management Panel */}
              {settingsSubTab === 'equipment' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6 animate-fadeIn" style={cardShadow}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                        <Settings size={18} className="text-[#fa7150]" />
                        Quản lý Trang thiết bị
                      </h3>
                      <p className="text-xs text-[#8a7e75] mt-1">Theo dõi số lượng, tình trạng vận hành và bảo trì máy móc, công cụ.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEquipmentId(null);
                        setEquipmentForm({ name: '', quantity: 1, status: 'GOOD', lastMaintenance: '' });
                        setShowAddEquipmentModal(true);
                      }}
                      style={orangeGradient}
                      className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                    >
                      + Thêm Thiết bị
                    </button>
                  </div>

                  {equipmentLoading ? (
                    <div className="py-12 text-center text-[#8a7e75] font-bold text-xs">
                      <span className="inline-block w-5 h-5 rounded-full border-2 border-[#fa7150]/20 border-t-[#fa7150] animate-spin mr-2"></span>
                      Đang tải danh sách thiết bị...
                    </div>
                  ) : equipmentList.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-[#e5d8d0] rounded-2xl bg-[#faf9f6]/40 text-[#8a7e75] font-bold text-xs">
                      Chưa có thiết bị nào được ghi nhận cho cơ sở này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-[#faf9f6] border-b border-[#e5d8d0] text-[9px] font-black text-[#8a7e75] uppercase tracking-wider">
                            <th className="p-4 pl-6">Tên thiết bị</th>
                            <th className="p-4 text-center">Số lượng</th>
                            <th className="p-4">Trạng thái vận hành</th>
                            <th className="p-4">Ngày bảo trì gần nhất</th>
                            <th className="p-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5d8d0]/60 font-bold">
                          {equipmentList.map((eq) => (
                            <tr key={eq.id} className="hover:bg-[#faf9f6]/30">
                              <td className="p-4 pl-6 text-[#303330]">{eq.name}</td>
                              <td className="p-4 text-center text-[#303330] font-black">{eq.quantity}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${eq.status === 'GOOD'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : eq.status === 'MAINTENANCE'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                  {eq.status === 'GOOD' ? 'Tốt (Sẵn sàng)' : eq.status === 'MAINTENANCE' ? 'Đang bảo trì' : 'Hỏng hóc'}
                                </span>
                              </td>
                              <td className="p-4 text-[#8a7e75] font-mono">{eq.lastMaintenance || 'Chưa bảo trì'}</td>
                              <td className="p-4 text-center flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEquipmentId(eq.id);
                                    setEquipmentForm({ name: eq.name, quantity: eq.quantity, status: eq.status, lastMaintenance: eq.lastMaintenance || '' });
                                    setShowAddEquipmentModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-[#fa7150]"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEquipment(eq.id)}
                                  className="p-1.5 text-gray-500 hover:text-rose-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                  onClick={() => alert('Đã lưu mẫu thông báo thành công!')}
                >
                  <Save size={14} /> Lưu Mẫu
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotificationSandboxModal(true)}
                  className="flex-1 py-3 bg-[#303330] hover:bg-black text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer"
                >
                  <MessageSquare size={14} /> Gửi tin thử nghiệm
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  TAB 6: QUẢN LÝ TÀI CHÍNH (FINANCE)  */}
        {activeTab === 'finance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Column 1 & 2: Wallet and Request Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Wallet Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Active Balance */}
                <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#8a7e75] block mb-1">Số dư Khả dụng</span>
                    <span className="text-2xl font-black text-[#303330]">{wallet.balance.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={24} />
                  </div>
                </div>

                {/* Pending Balance */}
                <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#8a7e75] block mb-1">Doanh thu Chờ đối soát</span>
                    <span className="text-2xl font-black text-amber-600">{wallet.pendingBalance.toLocaleString('vi-VN')} VNĐ</span>
                    <span className="text-[9px] text-[#8a7e75] block mt-1">(Cộng khi khách check-out thành công)</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              {/* Withdrawal Form */}
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6">
                <div className="border-b border-[#e5d8d0]/60 pb-4">
                  <h3 className="text-lg font-black text-[#303330]">Yêu cầu Rút Tiền</h3>
                  <p className="text-xs text-[#8a7e75]">Rút tiền từ số dư khả dụng về tài khoản ngân hàng của bạn.</p>
                </div>

                <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Ngân hàng</label>
                      <select
                        required
                        value={withdrawBank}
                        onChange={e => setWithdrawBank(e.target.value)}
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {banks.map((b: any) => (
                          <option key={b.code || b.bin} value={b.code || b.shortName || b.name}>
                            {b.shortName || b.name} ({b.code || b.bin})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Số tài khoản</label>
                      <input
                        type="text"
                        required
                        value={withdrawAccountNumber}
                        onChange={e => setWithdrawAccountNumber(e.target.value)}
                        placeholder="Nhập số tài khoản ngân hàng"
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên chủ tài khoản</label>
                      <input
                        type="text"
                        required
                        value={withdrawAccountName}
                        onChange={e => setWithdrawAccountName(e.target.value)}
                        placeholder="VIẾT HOA KHÔNG DẤU"
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Số tiền rút (VNĐ)</label>
                      <input
                        type="number"
                        required
                        min={50000}
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="Ví dụ: 500000"
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isWithdrawing}
                    style={{ background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }}
                    className="w-full py-3 text-white rounded-full font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isWithdrawing ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu rút tiền'}
                  </button>
                </form>
              </div>
            </div>

            {/* Column 3: History Logs */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6">
              <div className="border-b border-[#e5d8d0]/60 pb-4">
                <h3 className="text-lg font-black text-[#303330]">Lịch sử Rút Tiền</h3>
                <p className="text-xs text-[#8a7e75]">Danh sách các giao dịch rút tiền của bạn.</p>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {withdrawals.length === 0 ? (
                  <p className="text-center text-xs text-[#8a7e75] py-8">Chưa có giao dịch rút tiền nào.</p>
                ) : (
                  withdrawals.map((w: any) => (
                    <div key={w.id} className="p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[#fa7150]">{w.amount.toLocaleString('vi-VN')}đ</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${w.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                          {w.status === 'PENDING' ? 'Chờ duyệt' :
                            w.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                      </div>
                      <div className="text-[#8a7e75] leading-normal font-semibold space-y-0.5">
                        <div>Ngân hàng: <span className="text-[#303330]">{w.bankName}</span></div>
                        <div>Số tài khoản: <span className="text-[#303330]">{maskAccountNumber(w.bankAccountNumber)}</span></div>
                        <div>Chủ tài khoản: <span className="text-[#303330]">{w.bankAccountName}</span></div>
                        <div className="text-[10px] text-gray-400 mt-1">Yêu cầu lúc: {new Date(w.createdAt).toLocaleString('vi-VN')}</div>
                      </div>
                      {w.receiptImageUrl && (
                        <a
                          href={w.receiptImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block w-full py-1.5 bg-[#fdfaf8] border border-[#e5d8d0] hover:border-[#fa7150] text-[#fa7150] text-center rounded-lg font-black text-[10px] uppercase transition-colors"
                        >
                          Xem biên lai chuyển tiền
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL THÊM KHÁCH SẠN (WIZARD 3 BƯỚC) */}
      {showAddHotelModal && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left my-8">

            {/* Tiêu đề Modal & Stepper */}
            <div className="border-b border-[#e5d8d0]/60 pb-5 mb-6">
              <h3 className="text-2xl font-black text-[#303330]">{editingHotelId ? 'Cập nhật Thông tin Cơ sở' : 'Đăng ký Đối tác & Cơ sở mới'}</h3>
              <p className="text-xs text-[#8a7e75] mt-1">{editingHotelId ? 'Chỉnh sửa thông tin cơ bản của cơ sở đã đăng ký.' : 'Điền thông tin cơ sở để gửi hồ sơ. Admin sẽ xét duyệt trong 1–3 ngày làm việc.'}</p>
            </div>

            <form onSubmit={handleAddHotel} className="space-y-6 text-xs font-bold">

              {/* ── BƯỚC 1: HỒ SƠ CỬA HÀNG ── */}
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

                {/* Bản đồ Leaflet & Link Google Maps */}
                <div className="bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60 space-y-4">
                  <span className="text-[10px] text-[#fa7150] uppercase tracking-wider block mb-1">Định vị & Bản đồ</span>
                  <div>
                    <label className="block text-[#8a7e75] mb-1.5 uppercase">Link Google Maps (Hệ thống tự động nhận diện tọa độ)</label>
                    <input
                      type="url"
                      value={googleMapsUrl}
                      onChange={async e => {
                        const val = e.target.value
                        setGoogleMapsUrl(val)

                        // 1. Thử phân tích cục bộ
                        let parsedLocally = false
                        try {
                          if (val.includes('@')) {
                            const parts = val.split('@')[1].split(',')
                            if (parts.length >= 2) {
                              const parsedLat = parseFloat(parts[0])
                              const parsedLng = parseFloat(parts[1])
                              if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                                setLat(parsedLat)
                                setLng(parsedLng)
                                parsedLocally = true
                              }
                            }
                          } else if (val.includes('q=')) {
                            let sub = val.split('q=')[1]
                            if (sub.includes('&')) {
                              sub = sub.split('&')[0]
                            }
                            const parts = sub.split(',')
                            if (parts.length >= 2) {
                              const parsedLat = parseFloat(parts[0])
                              const parsedLng = parseFloat(parts[1])
                              if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                                setLat(parsedLat)
                                setLng(parsedLng)
                                parsedLocally = true
                              }
                            }
                          }
                        } catch (err) {
                          console.error('Lỗi parse tọa độ local:', err)
                        }

                        // 2. Nếu không parse được cục bộ và là link Google Maps hợp lệ, gọi backend resolve
                        if (!parsedLocally && val.startsWith('http') && (val.includes('maps') || val.includes('goo.gl'))) {
                          try {
                            const res = await axiosInstance.get('/api/hotels/resolve-coords', {
                              params: { url: val }
                            })
                            if (res.data && res.data.lat && res.data.lng) {
                              setLat(res.data.lat)
                              setLng(res.data.lng)
                            }
                          } catch (err) {
                            console.error('Lỗi gọi API resolve tọa độ:', err)
                          }
                        }
                      }}
                      placeholder="Ví dụ: https://www.google.com/maps/place/.../@10.7769,106.7009,17z/..."
                      className="w-full p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-[#8a7e75] block">Hoặc kéo marker/ghim trên bản đồ để chọn tọa độ chính xác:</span>
                    <Map lat={lat} lng={lng} onChange={(newLat, newLng) => {
                      setLat(newLat)
                      setLng(newLng)
                    }} />
                    <div className="flex gap-4 text-[10px] text-[#8a7e75] font-mono">
                      <span>Vĩ độ (Lat): <strong className="text-[#303330]">{lat.toFixed(6)}</strong></span>
                      <span>Kinh độ (Lng): <strong className="text-[#303330]">{lng.toFixed(6)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Loại hình dịch vụ */}
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Loại hình dịch vụ cung cấp</label>
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

                {/* Tiện nghi bổ sung */}
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Tiện nghi bổ sung</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60">
                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input type="checkbox" checked={amenityGarden} onChange={e => setAmenityGarden(e.target.checked)} className="rounded text-[#fa7150]" />
                      <span>Sân vườn riêng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input type="checkbox" checked={amenityAC} onChange={e => setAmenityAC(e.target.checked)} className="rounded text-[#fa7150]" />
                      <span>Điều hòa nhiệt độ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold">
                      <input type="checkbox" checked={amenityCamera} onChange={e => setAmenityCamera(e.target.checked)} className="rounded text-[#fa7150]" />
                      <span>Camera 24/7</span>
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
                    <div className="flex gap-3">
                      {/* Logo upload */}
                      {/* Logo upload */}
                      <div className="flex-1 text-center">
                        {logoUrl ? (
                          <div className="relative group aspect-video rounded-xl overflow-hidden border border-[#e5d8d0] bg-[#faf9f6]">
                            <img src={logoUrl} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setLogoUrl('')}
                              className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 animate-fade-in"
                            >
                              <Trash2 size={10} />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-[#303330]/65 text-white text-[8px] uppercase font-bold py-1 text-center tracking-wider">Logo</div>
                          </div>
                        ) : (
                          <label className="cursor-pointer bg-[#faf9f6]/40 hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-xl flex flex-col items-center justify-center aspect-video transition-all relative overflow-hidden">
                            <input type="file" accept="image/*" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
                            {uploadingField === 'logo' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            <Upload size={14} className="text-[#fa7150] mb-0.5" />
                            <span className="text-[8px] uppercase font-black text-[#8a7e75]">Tải Logo</span>
                          </label>
                        )}
                      </div>
                      {/* Front upload */}
                      <div className="flex-1 text-center">
                        {frontUrl ? (
                          <div className="relative group aspect-video rounded-xl overflow-hidden border border-[#e5d8d0] bg-[#faf9f6]">
                            <img src={frontUrl} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFrontUrl('')}
                              className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 animate-fade-in"
                            >
                              <Trash2 size={10} />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-[#303330]/65 text-white text-[8px] uppercase font-bold py-1 text-center tracking-wider">Mặt tiền</div>
                          </div>
                        ) : (
                          <label className="cursor-pointer bg-[#faf9f6]/40 hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-xl flex flex-col items-center justify-center aspect-video transition-all relative overflow-hidden">
                            <input type="file" accept="image/*" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'front')} />
                            {uploadingField === 'front' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            <Upload size={14} className="text-[#fa7150] mb-0.5" />
                            <span className="text-[8px] uppercase font-black text-[#8a7e75]">Mặt tiền</span>
                          </label>
                        )}
                      </div>
                      {/* Rooms upload */}
                      <div className="flex-1 text-center">
                        {roomsUrl ? (
                          <div className="relative group aspect-video rounded-xl overflow-hidden border border-[#e5d8d0] bg-[#faf9f6]">
                            <img src={roomsUrl} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setRoomsUrl('')}
                              className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 animate-fade-in"
                            >
                              <Trash2 size={10} />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-[#303330]/65 text-white text-[8px] uppercase font-bold py-1 text-center tracking-wider">Cơ sở vật chất</div>
                          </div>
                        ) : (
                          <label className="cursor-pointer bg-[#faf9f6]/40 hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-xl flex flex-col items-center justify-center aspect-video transition-all relative overflow-hidden">
                            <input type="file" accept="image/*" disabled={!!uploadingField} className="hidden" onChange={e => handleFileUpload(e, 'rooms')} />
                            {uploadingField === 'rooms' && (
                              <div className="absolute inset-0 bg-[#faf9f6]/95 flex flex-col items-center justify-center z-20">
                                <span className="w-4 h-4 border-2 border-[#fa7150]/30 border-t-[#fa7150] rounded-full animate-spin"></span>
                              </div>
                            )}
                            <Upload size={14} className="text-[#fa7150] mb-0.5" />
                            <span className="text-[8px] uppercase font-black text-[#8a7e75]">Cơ sở vật chất</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Album ảnh bổ sung */}
                    <div className="mt-4 pt-3 border-t border-[#e5d8d0]/40 text-left">
                      <span className="block text-[#8a7e75] uppercase text-[10px] tracking-wider mb-2">Album ảnh bổ sung ({hotelImages.length} ảnh)</span>
                      <div className="grid grid-cols-4 gap-2">
                        {hotelImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-[#e5d8d0]">
                            <img src={imgUrl} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setHotelImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}

                        {/* Upload button card */}
                        <label className="cursor-pointer bg-[#faf9f6]/40 hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-xl flex flex-col items-center justify-center aspect-video transition-all">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={!!uploadingField}
                            className="hidden"
                            onChange={e => handleFileUpload(e, 'hotelGallery')}
                          />
                          <Upload size={14} className="text-[#fa7150] mb-0.5" />
                          <span className="text-[8px] uppercase font-black">Thêm ảnh</span>
                        </label>
                      </div>
                    </div>

                    {uploadingField && <p className="text-[9px] text-[#fa7150] font-bold animate-pulse text-right">Đang tải tệp tin lên hệ thống...</p>}
                  </div>
                </div>

                {!editingHotelId && (
                  <div className="flex items-start gap-2.5 pt-4 border-t border-[#e5d8d0]/60">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#fa7150] cursor-pointer shrink-0"
                    />
                    <label htmlFor="agree-terms" className="text-[11px] text-[#8a7e75] font-normal cursor-pointer leading-relaxed">
                      Tôi đồng ý với <span className="text-[#fa7150] font-bold">Điều khoản hợp tác</span> của PetCare Hub. Hợp đồng chính thức sẽ được ký qua email sau khi hồ sơ được duyệt.
                    </label>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d8d0]/60">
                  <button type="button" onClick={() => { setShowAddHotelModal(false); setEditingHotelId(null); }} className="px-5 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer">Hủy bỏ</button>
                  <button
                    type="submit"
                    disabled={isAddingHotel || (!editingHotelId && !agreeTerms)}
                    className="px-6 py-3 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md hover:opacity-95 disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    {isAddingHotel ? (editingHotelId ? 'Đang lưu...' : 'Đang gửi hồ sơ...') : (editingHotelId ? 'Lưu thay đổi' : 'Hoàn tất & Gửi duyệt')}
                  </button>
                </div>
              </div>


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
      {/* MODAL THÊM/SỬA NHÂN VIÊN */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-xl font-black text-[#303330] mb-4">
              {editingStaffId ? 'Cập nhật Nhân viên' : 'Thêm Nhân sự Mới'}
            </h3>
            <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#8a7e75] mb-1.5 uppercase">Email tài khoản đăng ký</label>
                <input
                  type="email"
                  required
                  disabled={!!editingStaffId}
                  value={staffForm.email}
                  onChange={e => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ví dụ: nhanvien@gmail.com"
                  className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none focus:border-[#fa7150] disabled:bg-gray-100 disabled:text-gray-400"
                />
                {!editingStaffId && (
                  <p className="text-[9px] text-[#8a7e75] mt-1 font-normal">
                    * Lưu ý: Email này phải thuộc về tài khoản đã đăng ký trên hệ thống PetCare Hub.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#8a7e75] mb-1.5 uppercase">Chức vụ phụ trách</label>
                <select
                  value={staffForm.jobPosition}
                  onChange={e => setStaffForm(prev => ({ ...prev, jobPosition: e.target.value }))}
                  className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                >
                  <option value="Lễ tân">Lễ tân (Receptionist)</option>
                  <option value="Bác sĩ thú y">Bác sĩ thú y (Veterinarian)</option>
                  <option value="Chăm sóc viên">Chăm sóc viên (Pet Care Specialist)</option>
                  <option value="Giám sát">Giám sát (Supervisor)</option>
                  <option value="Vệ sinh">Vệ sinh (Cleaner)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8a7e75] mb-1.5 uppercase">Trạng thái ca trực</label>
                <select
                  value={staffForm.shiftStatus}
                  onChange={e => setStaffForm(prev => ({ ...prev, shiftStatus: e.target.value as any }))}
                  className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                >
                  <option value="ACTIVE">Đang trực ca (Active)</option>
                  <option value="OFF_DUTY">Nghỉ ca (Off-Duty)</option>
                  <option value="ON_LEAVE">Nghỉ phép (On Leave)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d8d0]/60">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-5 py-2.5 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md"
                >
                  {editingStaffId ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM/SỬA THIẾT BỊ */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-xl font-black text-[#303330] mb-4">
              {editingEquipmentId ? 'Cập nhật Thiết bị' : 'Thêm Thiết bị Mới'}
            </h3>
            <form onSubmit={handleEquipmentSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên thiết bị / Dụng cụ</label>
                <input
                  type="text"
                  required
                  value={equipmentForm.name}
                  onChange={e => setEquipmentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Máy sấy lông chuyên dụng 3000W"
                  className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none focus:border-[#fa7150]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8a7e75] mb-1.5 uppercase">Số lượng</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={equipmentForm.quantity}
                    onChange={e => setEquipmentForm(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8a7e75] mb-1.5 uppercase">Trạng thái vận hành</label>
                  <select
                    value={equipmentForm.status}
                    onChange={e => setEquipmentForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none cursor-pointer"
                  >
                    <option value="GOOD">Hoạt động tốt</option>
                    <option value="MAINTENANCE">Đang bảo dưỡng</option>
                    <option value="BROKEN">Hỏng hóc / Chờ sửa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8a7e75] mb-1.5 uppercase">Ngày bảo trì gần nhất (Năm-Tháng-Ngày)</label>
                <input
                  type="date"
                  value={equipmentForm.lastMaintenance}
                  onChange={e => setEquipmentForm(prev => ({ ...prev, lastMaintenance: e.target.value }))}
                  className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d8d0]/60">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-5 py-2.5 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#fa7150] text-white rounded-xl cursor-pointer shadow-md"
                >
                  {editingEquipmentId ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GIẢ LẬP GỬI THÔNG BÁO (SANDBOX) */}
      {showNotificationSandboxModal && (
        <div className="fixed inset-0 z-[110] bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-xl font-black text-[#303330] mb-2 flex items-center gap-2">
              <MessageSquare size={22} className="text-[#fa7150]" />
              Giả lập Gửi Thông báo & Live Preview
            </h3>
            <p className="text-xs text-[#8a7e75] mb-6">Trải nghiệm cách khách hàng nhận thông báo theo mẫu cấu hình của bạn.</p>

            {/* Channel selection */}
            <div className="flex gap-2 p-1 bg-[#f0ece9]/60 rounded-xl mb-6 font-bold">
              {(['SMS', 'Zalo', 'Email'] as const).map(channel => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setSandboxChannel(channel)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${sandboxChannel === channel
                      ? 'bg-white text-[#303330] shadow-sm'
                      : 'text-[#8a7e75] hover:text-[#303330]'
                    }`}
                >
                  {channel}
                </button>
              ))}
            </div>

            {/* Simulated Live Preview */}
            <div className="bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl p-6 mb-6">
              <span className="text-[9px] font-black text-[#8a7e75] uppercase block mb-3">Xem trước nội dung (Live Preview)</span>

              {sandboxChannel === 'Zalo' && (
                <div className="bg-white border border-[#e5d8d0] rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
                  {/* Zalo Header */}
                  <div className="bg-[#0068ff] p-3 flex items-center gap-2.5 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">P</div>
                    <div className="leading-tight text-left">
                      <span className="font-bold text-xs block">PetCare Hub Official</span>
                      <span className="text-[9px] opacity-85 block">✓ Tài khoản xác thực</span>
                    </div>
                  </div>
                  {/* Zalo Body */}
                  <div className="p-4 space-y-3 text-left">
                    <h4 className="font-black text-xs text-[#303330]">THÔNG BÁO XÁC NHẬN NHẬN PHÒNG</h4>
                    <p className="text-xs font-semibold text-[#5a5550] whitespace-pre-line leading-relaxed">
                      {emailTemplate
                        .replace('{{pet_name}}', 'Bé Bơ 🐶')
                        .replace('{{check_in_date}}', '15/06/2026')
                        .replace('{{room_type}}', 'Phòng Deluxe')
                        .replace('{{owner_name}}', 'Nguyễn Minh Anh')}
                    </p>
                    <div className="h-px bg-gray-100" />
                    <button type="button" className="w-full py-2 bg-[#f0f7ff] text-[#0068ff] font-black text-[10px] rounded-lg border border-[#0068ff]/10 hover:bg-[#e1f0ff] transition-colors cursor-pointer uppercase">
                      Xem chi tiết lịch đặt
                    </button>
                  </div>
                </div>
              )}

              {sandboxChannel === 'SMS' && (
                <div className="bg-[#e9e9eb] p-4 rounded-3xl max-w-xs mx-auto text-left relative">
                  <div className="text-[10px] text-gray-500 font-black text-center mb-2">SMS từ PetCareHub</div>
                  <div className="bg-white p-3 rounded-2xl text-xs font-semibold text-gray-800 leading-relaxed shadow-sm relative after:content-[''] after:absolute after:bottom-2 after:-left-1.5 after:w-3 after:h-3 after:bg-white after:rotate-45">
                    {emailTemplate
                      .replace('{{pet_name}}', 'Bé Bơ 🐶')
                      .replace('{{check_in_date}}', '15/06/2026')
                      .replace('{{room_type}}', 'Phòng Deluxe')
                      .replace('{{owner_name}}', 'Nguyễn Minh Anh')}
                  </div>
                </div>
              )}

              {sandboxChannel === 'Email' && (
                <div className="bg-white border border-[#e5d8d0] rounded-xl overflow-hidden shadow-sm text-left">
                  {/* Email header */}
                  <div className="bg-[#faf9f6] border-b border-[#e5d8d0]/60 p-3 text-[10px] text-[#8a7e75] space-y-1 font-bold">
                    <div>Từ: <span className="text-gray-700 font-mono">no-reply@petcarehub.com</span></div>
                    <div>Tới: <span className="text-gray-700 font-mono">minhanh.nguyen@gmail.com</span></div>
                    <div>Tiêu đề: <span className="text-gray-900 font-black">Xác nhận dịch vụ tại PetCare Hub</span></div>
                  </div>
                  {/* Email body */}
                  <div className="p-4 space-y-4">
                    <div className="w-12 h-12 bg-[#fa7150]/10 rounded-full flex items-center justify-center text-[#fa7150] mb-2">
                      <PawPrint size={24} />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 whitespace-pre-line leading-relaxed">
                      {emailTemplate
                        .replace('{{pet_name}}', 'Bé Bơ 🐶')
                        .replace('{{check_in_date}}', '15/06/2026')
                        .replace('{{room_type}}', 'Phòng Deluxe')
                        .replace('{{owner_name}}', 'Nguyễn Minh Anh')}
                    </p>
                    <p className="text-[10px] text-gray-400 font-normal">
                      Đây là email tự động gửi từ đối tác của PetCare Hub. Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex justify-between items-center pt-4 border-t border-[#e5d8d0]/60 font-bold">
              <span className="text-[10px] font-bold text-gray-400">Trạng thái: Sẵn sàng gửi tin giả lập</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotificationSandboxModal(false)}
                  className="px-5 py-2.5 bg-[#f5ede8] hover:bg-[#e5d8d0] rounded-xl cursor-pointer font-bold text-xs"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Đã giả lập gửi tin nhắn thành công qua kênh ${sandboxChannel} tới khách hàng Nguyễn Minh Anh!`);
                    setShowNotificationSandboxModal(false);
                  }}
                  style={orangeGradient}
                  className="px-6 py-2.5 text-white rounded-xl cursor-pointer shadow-md font-bold text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform"
                >
                  Gửi ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
