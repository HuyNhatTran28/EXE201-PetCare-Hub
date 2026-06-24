import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PawPrint,
  Calendar,
  Search,
  Heart,
  Scissors,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Star,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Utensils
} from 'lucide-react'

import { Header } from '@/components/Header'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'

export const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (user?.role === 'PARTNER') {
      navigate('/partner/dashboard', { replace: true })
    }
  }, [user, navigate])

  // WebGL Background Shader (ANIMATION_108 style)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationId: number
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `
    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      varying vec2 v_texCoord;

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
          vec2 uv = v_texCoord;
          vec2 mouse = u_mouse / u_resolution;
          
          vec3 color1 = vec3(0.957, 0.635, 0.380); // #F4A261 primary warm orange
          vec3 color2 = vec3(0.98, 0.976, 0.965); // Warm background beige
          vec3 color3 = vec3(0.267, 0.408, 0.231); // Kindred Paws Green accent (#44683B)
          
          float n = noise(uv * 3.0 + u_time * 0.1);
          n += noise(uv * 6.0 - u_time * 0.15) * 0.5;
          
          float dist = distance(uv, mouse);
          float mInfluence = smoothstep(0.4, 0.0, dist);
          n += mInfluence * 0.1;

          vec3 finalColor = mix(color2, color1, n * 0.45);
          finalColor = mix(finalColor, color3, pow(n, 4.0) * 0.08);
          
          float vignette = smoothstep(1.5, 0.5, length(uv - 0.5));
          finalColor *= vignette;

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `

    const cs = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()
    if (!prog) return
    const vsShader = cs(gl.VERTEX_SHADER, vs)
    const fsShader = cs(gl.FRAGMENT_SHADER, fs)
    if (!vsShader || !fsShader) return
    gl.attachShader(prog, vsShader)
    gl.attachShader(prog, fsShader)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(prog, 'a_position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes = gl.getUniformLocation(prog, 'u_resolution')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width
        const ny = 1.0 - (event.clientY - rect.top) / rect.height
        mouse.x = nx * canvas.width
        mouse.y = ny * canvas.height
      }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const syncSize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    syncSize()
    window.addEventListener('resize', syncSize)

    const render = (t: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uTime) gl.uniform1f(uTime, t * 0.001)
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height)
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', syncSize)
    }
  }, [])

  const [selectedPetType, setSelectedPetType] = useState('DOG')
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [roomIndex, setRoomIndex] = useState(0)
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [roomsError, setRoomsError] = useState<string | null>(null)

  const slideshowImages = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBgrELGEqX9G6MrL8w4viL8wWxFNa4NA9XfZHltCK7U7KWU16x2ncsJbZ1akVimUuYBT7ysN8QfIrXYJdKi2MNHTD96LSVF36Z4FsUuKJNAmOeJhJ_LJ9fEaKMIHw1Wf5CpaPvGRjCi_7ZIpQn3hbyToXK7jxa8IepMJQNt2QgKdYy_ez_cr4e1O2H7P_WrT6qjylH5TZvzo1R28lRd3fi0ksY6kY6kMj8cgZRRHJBcVC_A2yKRby4Kn-NKChGjS-voGd1TncgLJSEi",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDSvF4C5HvsXyxQJ80WAlQ2X0ih-j_xH5irvc5d4SnBo0EvJvAFePFPervgfSR1b3A3g_sj_u6vb9RVvSxTnzb_T1q99ocF-BuG3dRyvg1omDOYhCa0KB89QBHIqMh_DYmLqvrsiyUrtrsgrUISnmQng0Q4S9_sjTDk9dIkLTcR-yjFOpYc8a7cGwqeDIj1FupozgjTPYVcosv9KAe_GjtoX4Oyw2pQevLAlhn3wVLsr_4ag6T7dTYyOa6zyZDOwgPOuwFEW2uH7KQP",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDK2JQjwkBQKWNdP_s270Dcbcynv7aZ_CJr9u11H3r2Zg4oNEVBLMhmlrAszV5guVsGRI7c_wgAQvq-UbrsOgZ9aO4LqBiDSX0ro6W9fWQK_Lh-P3bX7rK1juw_r4u0CWrSNN_6USooycJwXWFwF-rH_WnwAyQnidpVa4Dk0tH_TmqYKZbw9I6h8nwMRwGEW4bB2Qe50qS7oYPy3VndoGbW-YDAeQp997wr7dUUBhu5NCmDWNczjwsIpxifU2RrgAfRSQxLMI2DglKd",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800"
  ]

  const fallbackRooms = [
    {
      id: 'default-1',
      name: 'Deluxe Garden Suite',
      pricePerNight: 450000,
      allowedPetTypes: ['DOG'],
      description: 'Lối đi riêng ra ban công cỏ xanh mát & đệm ngủ orthopedic êm ái.',
      images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDgfm5N85OjZH2i_oSez_41ZkbQRif-ad-B_EH-Eoo_fOLpgbRDXnDwMpIiZ76NiEPqDUoM4yCNHURpRGxE5obuxpmVhjkyFe5LaMQrKp64MWV2XcvEzYp56dHGGsAcJW3BLrCMfBwrOHeBxkvPu6axXI5oeBEw84Dd2zUSjnMgoulFrQDOowZWPb-rg7UB7X9VEXVJ0SVsNyMN0V1Jg_6cGVrUYswH0Kxao0kLTPU-CfrHOi1Ds4rWpON4y4--yzs6w2d9D-0MSEx-'],
      hotelId: 'default-hotel-1'
    },
    {
      id: 'default-2',
      name: 'The Zenith Loft',
      pricePerNight: 350000,
      allowedPetTypes: ['CAT'],
      description: 'Không gian leo trèo nhiều tầng đặc trưng & cửa sổ ngắm chim trời.',
      images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuDSvF4C5HvsXyxQJ80WAlQ2X0ih-j_xH5irvc5d4SnBo0EvJvAFePFPervgfSR1b3A3g_sj_u6vb9RVvSxTnzb_T1q99ocF-BuG3dRyvg1omDOYhCa0KB89QBHIqMh_DYmLqvrsiyUrtrsgrUISnmQng0Q4S9_sjTDk9dIkLTcR-yjFOpYc8a7cGwqeDIj1FupozgjTPYVcosv9KAe_GjtoX4Oyw2pQevLAlhn3wVLsr_4ag6T7dTYyOa6zyZDOwgPOuwFEW2uH7KQP'],
      hotelId: 'default-hotel-2'
    },
    {
      id: 'default-3',
      name: 'Presidential Manor',
      pricePerNight: 850000,
      allowedPetTypes: ['DOG_SMALL', 'DOG_LARGE', 'CAT'],
      description: 'Quản gia chăm sóc riêng 24/7 & không giới hạn liệu trình spa thư giãn.',
      images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBWlswjRUEn9gUBfwNddofi8-MDKVD73XFrinIVuBvZhzg5EoVUTw5odNjpdHIr9s73Svo84B7Nt7WKoWTeNsD6-Fyf5kPLVyHs2p5jDFLANkNvG2f9F_3FW_I90eeRC2xHp0N3-C7gUKq98GDsQn7OMBgJIONTqkDgWR4WxY8dA2GSf7-EcWIHURnevsN6VB9KU-sjZ-JYT3jvuJX8PvIjj5jcxJkfijWs0PPqwjeKjVJEt1eGfZyPQG6gFrHdooyxfGdjcaytHs3w'],
      hotelId: 'default-hotel-3'
    }
  ]

  const activeRoomsList = roomTypes.length > 0 ? roomTypes : fallbackRooms
  const displayedRooms = activeRoomsList.slice(roomIndex, roomIndex + 3)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % slideshowImages.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const fetchRooms = () => {
    setIsLoadingRooms(true)
    setRoomsError(null)
    axiosInstance.get('/api/room-types/highest-price')
      .then(res => {
        if (res.data) {
          setRoomTypes(res.data)
        }
      })
      .catch(err => {
        console.error("Failed to fetch room types", err)
        setRoomsError("Không thể tải danh sách phòng. Vui lòng thử lại sau.")
      })
      .finally(() => {
        setIsLoadingRooms(false)
      })
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const nextRooms = () => {
    if (roomIndex + 3 < activeRoomsList.length) {
      setRoomIndex(prev => prev + 1)
    }
  }

  const prevRooms = () => {
    if (roomIndex > 0) {
      setRoomIndex(prev => prev - 1)
    }
  }

  const handleSearch = () => {
    if (!user) {
      navigate('/login', { state: { from: '/hotels', petType: selectedPetType } })
    } else {
      navigate('/hotels', { state: { petType: selectedPetType } })
    }
  }

  const handleTestimonialLink = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/pets' } })
    } else {
      navigate('/pets')
    }
  }

  const handleExplorePlayZones = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/hotels' } })
    } else {
      navigate('/hotels')
    }
  }

  const handleViewAllRooms = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/hotels' } })
    } else {
      navigate('/hotels')
    }
  }

  const handleRoomClick = (hotelId: string) => {
    if (!user) {
      navigate('/login', { state: { from: `/hotels/${hotelId}` } })
    } else {
      navigate(`/hotels/${hotelId}`)
    }
  }

  const handleServiceBooking = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/hotels' } })
    } else {
      navigate('/hotels')
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary-container selection:text-on-primary-container bg-transparent relative">
      
      {/* WebGL Canvas Background */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10 pointer-events-none" />

      {/* ── 1. HEADER (NAVBAR) ─────────────────────────────────── */}
      <Header />

      {/* ── 2. HERO SECTION ───────────────────────────────────── */}
      <header className="relative pt-32 pb-20 px-8 overflow-hidden text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Text */}
          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 bg-[#d0fac0]/80 backdrop-blur-sm text-[#3e6135] rounded-full text-sm font-semibold mb-6">
              Nền tảng thú cưng đáng tin cậy
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold leading-[1.1] mb-8 tracking-tight text-[#303330]">
              Nơi mỗi <span className="text-[#a43e24]">bạn nhỏ</span> tìm thấy bình yên.
            </h1>
            <p className="text-lg md:text-xl text-[#5d605c] leading-relaxed mb-10 max-w-lg">
              Khu nghỉ dưỡng đặc biệt được thiết kế riêng cho sự thoải mái, an toàn và niềm vui của những người bạn nhỏ đáng yêu. Vì chúng cũng xứng đáng có một kỳ nghỉ tuyệt vời.
            </p>

            {/* Quick Search Bar */}
            <div className="glass-card sunlight-shadow p-4 rounded-3xl md:rounded-full flex flex-col md:flex-row gap-4 items-center border border-white/40">
              <div className="flex-1 w-full flex items-center gap-3 px-4">
                <PawPrint className="text-[#a43e24]" size={24} />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#797b78]">Loại Thú Cưng</span>
                  <select 
                    value={selectedPetType} 
                    onChange={(e) => setSelectedPetType(e.target.value)}
                    className="bg-transparent border-none p-0 focus:ring-0 font-bold text-[#303330] cursor-pointer text-sm outline-none"
                  >
                    <option value="DOG">Chó Cưng</option>
                    <option value="CAT">Mèo Cưng</option>
                    <option value="SMALL">Thú Cưng Nhỏ</option>
                  </select>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-[#b1b2af]/30 hidden md:block"></div>
              <div className="flex-1 w-full flex items-center gap-3 px-4">
                <Calendar className="text-[#a43e24]" size={24} />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-[#797b78]">Thời Gian</span>
                  <input 
                    className="bg-transparent border-none p-0 focus:ring-0 font-bold text-[#303330] w-full text-sm outline-none" 
                    type="text" 
                    value="Hôm nay - Ngày mai" 
                    readOnly
                  />
                </div>
              </div>
              <button 
                onClick={handleSearch}
                className="bg-gradient-to-br from-[#a43e24] to-[#ffac98] text-white h-14 w-full md:w-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md shadow-[#a43e24]/20 cursor-pointer shrink-0"
              >
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="relative">
            <div className="organic-shape bg-[#ffac98]/20 absolute -top-10 -right-10 w-full h-full -z-10 animate-pulse"></div>
            <div className="rounded-[2rem] overflow-hidden sunlight-shadow relative aspect-[4/5] md:aspect-square border-[8px] border-white">
              <img 
                alt="Chú chó vui vẻ trên giường êm" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK2JQjwkBQKWNdP_s270Dcbcynv7aZ_CJr9u11H3r2Zg4oNEVBLMhmlrAszV5guVsGRI7c_wgAQvq-UbrsOgZ9aO4LqBiDSX0ro6W9fWQK_Lh-P3bX7rK1juw_r4u0CWrSNN_6USooycJwXWFwF-rH_WnwAyQnidpVa4Dk0tH_TmqYKZbw9I6h8nwMRwGEW4bB2Qe50qS7oYPy3VndoGbW-YDAeQp997wr7dUUBhu5NCmDWNczjwsIpxifU2RrgAfRSQxLMI2DglKd"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── 3. WHY CHOOSE US (BENTO GRID) ─────────────────────── */}
      <section className="py-24 px-8 bg-[#f4f4f0]/40 backdrop-blur-md border-y border-[#e1e3df] text-left">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-extrabold text-[#303330] mb-4">Thiết kế cho sự hạnh phúc của bé cưng</h2>
            <p className="text-[#5d605c] max-w-2xl mx-auto text-sm sm:text-base">Chúng tôi không chỉ là nơi lưu trữ; chúng tôi mang lại một không gian như ngôi nhà thứ hai tràn đầy yêu thương và chăm sóc chuyên nghiệp.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Certified Expert Care */}
            <div className="md:col-span-2 bg-white/80 backdrop-blur-sm p-10 rounded-3xl border border-white/40 shadow-sm flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-grow">
                <div className="w-12 h-12 bg-[#d0fac0] rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck size={24} className="text-[#2c4e24]" />
                </div>
                <h3 className="font-headline text-2xl font-bold text-[#303330] mb-4">Chuyên Gia Tận Tâm</h3>
                <p className="text-[#5d605c] leading-relaxed text-sm">Đội ngũ bảo mẫu bao gồm các chuyên gia hành vi động vật và bác sĩ thú y trực tuyến, đảm bảo bé cưng luôn ở trong vòng tay an toàn nhất 24/7.</p>
              </div>
              <div className="rounded-2xl overflow-hidden h-64 w-full md:w-80 shrink-0">
                <img className="w-full h-full object-cover" alt="Bảo mẫu âu yếm mèo cưng" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb7HwOSSiYlIypTlO4DD6tnUSvk-LXYN3jcXr1oubEQrDAO8P7xhO-jWqeipohnPDwNH-c9xICfKvhxZMB5KDpEe5Mu9sOo3Jgic_GQGzxmSKwz7-tBum3SQojNxLNhwzpRK0VIxtYm0CEoIRh-wyT88WCD8o2E2Dk47trIuuokm9tp18EiCoELi_ZdCmRSNDX4JJ3EX_pGDMYV7kRXl-nobmO4zVF-hxqY5wScN0CbPOLmXivXauXBx1WNdjaD8BTdYfxUi9hl3FX" />
              </div>
            </div>

            {/* Card 2: Care Diary */}
            <div className="bg-[#ffac98]/20 backdrop-blur-sm p-10 rounded-3xl border border-[#ffac98]/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-[#ffac98]/30 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen size={22} className="text-[#a43e24]" />
                </div>
                <h3 className="font-headline text-2xl font-bold text-[#303330] mb-4">Nhật Ký Chăm Sóc Từng Giờ</h3>
                <p className="text-[#5d605c] text-sm leading-relaxed">Đội ngũ nhân viên tận tâm cập nhật chi tiết hoạt động, bữa ăn và những khoảnh khắc đáng yêu của bé cưng mỗi giờ, giúp bạn luôn yên tâm dõi theo hành trình của thú cưng.</p>
              </div>
              <button 
                onClick={handleTestimonialLink} 
                className="mt-8 text-[#a43e24] font-bold flex items-center gap-2 group text-sm hover:underline cursor-pointer bg-transparent border-none p-0 text-left outline-none"
              >
                Tìm hiểu thêm <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 3: Gourmet Meals */}
            <div className="bg-white/80 backdrop-blur-sm p-10 rounded-3xl border border-white/40 shadow-sm">
              <div className="w-12 h-12 bg-[#feeadb] rounded-2xl flex items-center justify-center mb-6">
                <Utensils size={22} className="text-[#a43e24]" />
              </div>
              <h3 className="font-headline text-2xl font-bold text-[#303330] mb-4">Bữa Ăn Hảo Hạng</h3>
              <p className="text-[#5d605c] leading-relaxed text-sm">Chế độ dinh dưỡng cá nhân hóa sử dụng các nguyên liệu tươi ngon chọn lọc chuẩn bị hằng ngày bởi các đầu bếp thú cưng.</p>
            </div>

            {/* Card 4: Spacious Play Zones */}
            <div className="md:col-span-2 bg-[#44683b] text-white p-10 rounded-3xl overflow-hidden relative group">
              <div className="relative z-10 flex flex-col justify-center h-full max-w-full md:max-w-[45%]">
                <h3 className="font-headline text-2xl font-bold mb-4">Không Gian Vui Chơi Đa Dạng</h3>
                <p className="opacity-90 leading-relaxed text-sm mb-6">Tùy thuộc vào từng cơ sở liên kết, các bé cưng sẽ được trải nghiệm các không gian vui chơi ngoài trời hoặc trong nhà an toàn, lành mạnh để tự do rèn luyện thể chất và kết bạn.</p>
                <button 
                  onClick={handleExplorePlayZones} 
                  className="bg-[#d0fac0] text-[#3e6135] px-6 py-2.5 rounded-full w-fit font-bold hover:scale-105 transition-transform text-xs uppercase tracking-wider cursor-pointer"
                >
                  Khám Phá Khuôn Viên
                </button>
              </div>
              <img 
                className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-40 group-hover:scale-110 transition-transform duration-700 hidden md:block rounded-r-3xl" 
                alt="Những chú chó vui chơi trên bãi cỏ" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUPhHDCIWIiBecR_SfLwBv8qIyb1YbZgFerTfmYit6h7Uj8DTrjO8M2bVVnLLhW-ctyoDlyY_bTsvqXERVqM7qsPwO3WLYyumBQCiVG1-6K3ZJDRJKuEEyMbvMo94ti3tOeV-kSGRLYcIr_IH-7RWlFEV6P0XvHWJNLemm7wNO_0KoeQHpwAejtLOzRokeObA36VmRPkIzbVJzdSklGKwurfk14GO3F9d3h7mLN8GIsDrfqE87h5lspBFoRTpZV2v3D8emupAPxD6J"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. SUITE PREVIEWS ─────────────────────────────────── */}
      {(!isLoadingRooms && !roomsError && activeRoomsList.length === 0) ? null : (
        <section className="py-24 px-8 overflow-hidden bg-white/5 backdrop-blur-sm text-left">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-xl">
                <h2 className="font-headline text-4xl font-bold text-[#303330] mb-4">Các Hạng Phòng Premium</h2>
                <p className="text-[#5d605c] leading-relaxed text-sm">Không gian được thiết kế hoàn hảo cho từng tính cách riêng biệt, từ chú cún năng động đến chú mèo quý tộc.</p>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                {!isLoadingRooms && !roomsError && activeRoomsList.length > 0 && (
                  <button 
                    onClick={handleViewAllRooms} 
                    className="text-[#a43e24] font-bold border-b-2 border-[#a43e24]/20 hover:border-[#a43e24] transition-colors pb-1 text-sm cursor-pointer bg-transparent border-none p-0 outline-none"
                  >
                    Xem tất cả các phòng
                  </button>
                )}
                {!isLoadingRooms && !roomsError && activeRoomsList.length > 3 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={prevRooms}
                      disabled={roomIndex === 0}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        roomIndex === 0 ? 'opacity-30 border-[#b1b2af]/40 text-[#b1b2af]' : 'border-[#a43e24] text-[#a43e24] hover:bg-[#a43e24] hover:text-white cursor-pointer bg-transparent'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={nextRooms}
                      disabled={roomIndex + 3 >= activeRoomsList.length}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        roomIndex + 3 >= activeRoomsList.length ? 'opacity-30 border-[#b1b2af]/40 text-[#b1b2af]' : 'border-[#a43e24] text-[#a43e24] hover:bg-[#a43e24] hover:text-white cursor-pointer bg-transparent'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isLoadingRooms ? (
              /* Loading Skeleton (3 cards) */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="animate-pulse flex flex-col">
                    <div className="rounded-3xl h-[350px] bg-white/20 border border-[#e1e3df]/40 mb-6"></div>
                    <div className="h-4 bg-white/20 rounded-full w-1/4 mb-3"></div>
                    <div className="h-6 bg-white/20 rounded-full w-3/4 mb-2"></div>
                    <div className="h-4 bg-white/20 rounded-full w-full"></div>
                  </div>
                ))}
              </div>
            ) : roomsError ? (
              /* Error State */
              <div className="glass-card p-12 rounded-3xl border border-white/40 text-center max-w-lg mx-auto shadow-md">
                <p className="text-stone-700 font-bold mb-6">{roomsError}</p>
                <button 
                  onClick={fetchRooms}
                  className="px-6 py-2.5 bg-[#a43e24] hover:bg-[#a43e24]/90 text-white rounded-full font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              /* Room List with dynamic columns centering */
              <div className={`grid gap-10 ${
                activeRoomsList.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 
                activeRoomsList.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 
                'grid-cols-1 md:grid-cols-3'
              }`}>
                {displayedRooms.map((room: any) => {
                  const isDog = room.allowedPetTypes?.some((t: string) => t.toUpperCase().includes('DOG'))
                  const isCat = room.allowedPetTypes?.some((t: string) => t.toUpperCase().includes('CAT'))
                  const categoryText = isDog ? 'DÀNH CHO CHÓ' : isCat ? 'DÀNH CHO MÈO' : 'THÚ CƯNG KHÁC'
                  const roomImage = (room.images && room.images.length > 0) ? room.images[0] : 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'
                  
                  return (
                    <div 
                      key={room.id} 
                      className="group cursor-pointer"
                      onClick={() => handleRoomClick(room.hotelId)}
                    >
                      <div className="rounded-3xl overflow-hidden mb-6 relative aspect-[4/5] sunlight-shadow bg-white">
                        <img 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          alt={room.name} 
                          src={roomImage}
                        />
                        <div className="absolute inset-0 bg-[#a43e24]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[#a43e24] font-bold text-sm sunlight-shadow">
                          {room.pricePerNight.toLocaleString('vi-VN')}đ/đêm
                        </div>
                      </div>
                      <div className="flex justify-between items-start text-left">
                        <div>
                          <span className="text-xs font-bold text-[#3e6135] uppercase tracking-widest mb-2 block">{categoryText}</span>
                          <h4 className="font-headline text-xl font-bold mb-1 text-[#303330] group-hover:text-[#a43e24] transition-colors">{room.name}</h4>
                          <p className="text-sm text-[#5d605c] line-clamp-2">{room.description || 'Không gian nghỉ dưỡng lý tưởng dành cho bé cưng.'}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRoomClick(room.hotelId)
                          }} 
                          className="w-10 h-10 rounded-full border border-[#b1b2af]/40 flex items-center justify-center text-[#5d605c] hover:bg-[#a43e24] hover:text-white hover:border-[#a43e24] transition-all shrink-0 ml-4 bg-transparent outline-none cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 5. SERVICE HIGHLIGHTS ──────────────────────────────── */}
      <section className="py-24 px-8 bg-[#f4f4f0]/40 backdrop-blur-md relative overflow-hidden text-left border-y border-[#e1e3df]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="font-headline text-4xl font-bold text-[#303330] mb-4">Hơn cả một nơi nghỉ dưỡng</h2>
            <div className="w-20 h-1 bg-[#a43e24] rounded-full mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center border border-white/40 flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="relative aspect-video bg-white overflow-hidden">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    alt="Cắt Tỉa Lông Chuyên Nghiệp" 
                    src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=600"
                  />
                  <div className="absolute bottom-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md">
                    <Scissors className="text-[#a43e24]" size={20} />
                  </div>
                </div>
                <div className="p-8 pb-0">
                  <h3 className="font-headline text-2xl font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors mb-4">
                    Cắt Tỉa Lông Chuyên Nghiệp
                  </h3>
                  <p className="text-[#5d605c] leading-relaxed text-sm mb-6">
                    Tận hưởng quy trình tắm bồn massage bong bóng, sấy mát và tạo kiểu lông thời thượng theo đặc tính giống loài.
                  </p>
                </div>
              </div>
              <div className="px-8 pb-8">
                <button 
                  onClick={handleServiceBooking}
                  className="text-[#a43e24] group-hover:text-[#821a01] font-bold flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider hover:underline bg-transparent border-none cursor-pointer p-0 outline-none mx-auto"
                >
                  Đặt Lịch Ngay <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center border border-white/40 flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="relative aspect-video bg-white overflow-hidden">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    alt="Spa & Massage Trị Liệu" 
                    src="/dog_spa_massage.png"
                  />
                  <div className="absolute bottom-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md">
                    <Sparkles className="text-[#a43e24]" size={20} />
                  </div>
                </div>
                <div className="p-8 pb-0">
                  <h3 className="font-headline text-2xl font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors mb-4">
                    Spa & Massage Trị Liệu
                  </h3>
                  <p className="text-[#5d605c] leading-relaxed text-sm mb-6">
                    Liệu pháp xông tinh dầu thảo dược và các động tác massage dịu nhẹ hỗ trợ xoa dịu cơ khớp bị nhức mỏi.
                  </p>
                </div>
              </div>
              <div className="px-8 pb-8">
                <button 
                  onClick={handleServiceBooking}
                  className="text-[#a43e24] group-hover:text-[#821a01] font-bold flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider hover:underline bg-transparent border-none cursor-pointer p-0 outline-none mx-auto"
                >
                  Đặt Lịch Ngay <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Service 3 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center border border-white/40 flex flex-col justify-between overflow-hidden group">
              <div>
                <div className="relative aspect-video bg-white overflow-hidden">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    alt="Hoạt Động Mỗi Ngày" 
                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=600"
                  />
                  <div className="absolute bottom-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md">
                    <Heart className="text-[#a43e24]" size={20} />
                  </div>
                </div>
                <div className="p-8 pb-0">
                  <h3 className="font-headline text-2xl font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors mb-4">
                    Hoạt Động Mỗi Ngày
                  </h3>
                  <p className="text-[#5d605c] leading-relaxed text-sm mb-6">
                    Trải nghiệm các trò chơi xếp hình trí tuệ, bài tập vượt rào giải phóng năng lượng và giao lưu cùng các bạn thú cưng khác.
                  </p>
                </div>
              </div>
              <div className="px-8 pb-8">
                <button 
                  onClick={handleServiceBooking}
                  className="text-[#a43e24] group-hover:text-[#821a01] font-bold flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider hover:underline bg-transparent border-none cursor-pointer p-0 outline-none mx-auto"
                >
                  Đặt Lịch Ngay <ArrowRight size={12} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 6. PET DIARY / TESTIMONIALS ───────────────────────── */}
      <section className="py-24 px-8 text-left bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Photo side */}
          <div className="relative">
            <div className="absolute -inset-4 bg-[#feeadb]/30 rounded-3xl -rotate-2 backdrop-blur-sm border border-[#feeadb]/20"></div>
            <div className="relative rounded-[2rem] overflow-hidden aspect-video border-[6px] border-white shadow-2xl bg-white">
              <img 
                className="w-full h-full object-cover transition-all duration-700" 
                alt="Gương mặt chú cún tươi cười hạnh phúc" 
                src={slideshowImages[slideshowIndex]}
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-tr from-[#a43e24] to-[#ffac98] rounded-full flex flex-col items-center justify-center text-white p-6 text-center border-[6px] border-white shadow-xl">
              <span className="text-3xl font-extrabold leading-none">4.9/5</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1.5 opacity-90">Hài lòng tuyệt đối</span>
            </div>
          </div>

          {/* Testimonial info */}
          <div>
            <h2 className="font-headline text-4xl font-bold text-[#303330] mb-8">Nhật Ký Thú Cưng</h2>
            <div className="space-y-8">
              <div className="glass-card p-8 rounded-3xl shadow-md border-l-4 border-[#a43e24] border-t border-r border-b border-[#e1e3df]/60">
                <div className="flex gap-1.5 mb-4 text-[#a43e24]">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="italic text-base sm:text-lg text-[#303330] leading-relaxed mb-6 font-medium">
                  "Cooper đã có khoảng thời gian tuyệt vời! Tôi cực kỳ thích nhận các hình ảnh cập nhật hoạt động hàng ngày của bé cưng, giúp tôi hoàn toàn yên tâm trong suốt những ngày đi công tác xa nhà."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-[#b1b2af]/40">
                    <img className="w-full h-full object-cover" alt="Portrait of a satisfied customer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcn9K33zeJkODb17aSI88TRXbs9yEV4zfyq8kSmZo4OFto7bwIkKYsPXm_Xk_91B7Ih-zwiPmCYUh6J3ECByyaMGbMAf3C8iJxzh2KHg2NtXfx0czX3ErqyllJGIgNlW0W_SMWGoHtUng212WZbH_x_jMKdZ8GC5iYpvxZz3Z6onRsquMF9hsvNcwY5lquxdE25qz2_1aAonyQXDokSyhPDRk9zy9plePDVkbzn-Y8HKYQ7Ecmge9Hk1x0n6kAzI3IOKZBgJoB3yLf" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[#303330] text-sm">Hồng Nhung</h5>
                    <p className="text-xs text-[#5d605c] font-bold">Mẹ của bé Cooper (Golden Retriever)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 7. FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[#f4f4f0]/60 backdrop-blur-xl py-16 px-8 border-t border-white/10 text-left">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            <div className="md:col-span-1">
              <div className="text-2xl font-bold text-[#a43e24] tracking-tight font-headline mb-6">PetCare Hub</div>
              <p className="text-stone-600 font-body text-sm leading-relaxed mb-6">Nền tảng kết nối chủ nuôi thú cưng với các khách sạn và dịch vụ chăm sóc cao cấp trên toàn quốc.</p>

            </div>

            <div>
              <h5 className="font-extrabold text-sm uppercase tracking-wider text-[#303330] mb-6">Liên Kết Nhanh</h5>
              <ul className="space-y-4 text-sm font-semibold text-stone-600">
                <li><Link to="/hotels" className="hover:text-[#a43e24] transition-colors">Đặt Phòng</Link></li>
                <li><Link to="/route-search" className="hover:text-[#a43e24] transition-colors">Tìm Tuyến Đường</Link></li>
                <li><Link to="/my-bookings" className="hover:text-[#a43e24] transition-colors">Lịch Đặt Phòng</Link></li>
                <li><Link to="/profile" className="hover:text-[#a43e24] transition-colors">Thông Tin Cá Nhân</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-extrabold text-sm uppercase tracking-wider text-[#303330] mb-6">Dịch Vụ Nổi Bật</h5>
              <ul className="space-y-4 text-sm font-semibold text-stone-600">
                <li><Link to="/hotels" className="hover:text-[#a43e24] transition-colors">Khách Sạn Chó Cưng</Link></li>
                <li><Link to="/hotels" className="hover:text-[#a43e24] transition-colors">Căn Hộ Mèo Cưng</Link></li>
                <li><Link to="/hotels" className="hover:text-[#a43e24] transition-colors">Grooming & Cắt Tỉa</Link></li>
                <li><Link to="/hotels" className="hover:text-[#a43e24] transition-colors">Spa & Massage</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-extrabold text-sm uppercase tracking-wider text-[#303330] mb-6">Đăng Ký Nhận Bản Tin</h5>
              <p className="text-stone-600 text-sm mb-4">Nhận ngay mẹo chăm sóc thú cưng hữu ích & ưu đãi đặc biệt mới nhất.</p>
              <div className="relative">
                <input className="w-full bg-white/80 border border-[#b1b2af]/30 rounded-full px-6 py-3 text-sm focus:ring-2 focus:ring-[#a43e24]/20 outline-none" placeholder="Địa chỉ email" type="email" />
                <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#a43e24] hover:bg-[#a43e24]/90 text-white px-5 rounded-full text-xs font-bold transition-all cursor-pointer">Gửi</button>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-[#b1b2af]/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-500 font-semibold">
            <p>© 2026 PetCare Hub. Mọi quyền được bảo lưu.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[#a43e24]">Chính sách bảo mật</a>
              <a href="#" className="hover:text-[#a43e24]">Điều khoản sử dụng</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

