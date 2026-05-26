import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  PlusCircle,
  Clock,
  Sparkles,
  Scissors,
  Truck,
  Utensils,
  PlusSquare,
  Edit2
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface Service {
  id: string
  name: string
  description: string
  price: number
  durationMinutes: number
  serviceType: string
}

export const ServiceManagePage = () => {
  const { hotelId } = useParams<{ hotelId: string }>()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axiosInstance.get(`/api/services/hotel/${hotelId}`)
        setServices(response.data)
      } catch (error) {
        console.error('Failed to load services', error)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [hotelId])

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'SPA': return <Sparkles size={20} />
      case 'GROOMING': return <Scissors size={20} />
      case 'TRANSPORT': return <Truck size={20} />
      case 'FOOD': return <Utensils size={20} />
      default: return <PlusSquare size={20} />
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans text-left">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="text-[#8a7e75] hover:text-[#fa7150] transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <span className="text-xl font-bold tracking-tight">Cấu hình Dịch Vụ</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black text-[#303330]">Dịch Vụ Đi Kèm</h1>
            <p className="text-[#5a5550] text-sm mt-1">Cài đặt các gói dịch vụ làm đẹp, trị liệu massage thủy liệu, đưa đón tận nơi hoặc chế độ dinh dưỡng đặc biệt.</p>
          </div>
          <button className="bg-[#fa7150] text-white px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer">
            <PlusCircle size={16} /> Thêm dịch vụ mới
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#8a7e75] font-bold text-sm">Đang tải danh sách dịch vụ...</div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-white">
            <p className="text-[#8a7e75] font-bold text-sm">Khách sạn chưa cấu hình dịch vụ nào. Hãy thêm dịch vụ để gia tăng thêm doanh thu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.id} className="bg-white border border-[#e5d8d0] rounded-3xl p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#fff0e6] text-[#fa7150] flex items-center justify-center">
                    {getServiceIcon(service.serviceType)}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#303330] line-clamp-1">{service.name}</h3>
                    <span className="text-[10px] font-black text-[#8a7e75] bg-[#f5ede8] px-2 py-0.5 rounded-md uppercase tracking-wider mt-1 inline-block">
                      {service.serviceType}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#5a5550] leading-relaxed mb-6 line-clamp-2 h-8">{service.description || 'Chưa có mô tả chi tiết cho dịch vụ này.'}</p>

                <div className="flex justify-between items-center border-t border-[#e5d8d0]/60 pt-4">
                  <div>
                    <span className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-0.5">Giá trọn gói</span>
                    <span className="text-lg font-black text-[#a43e24]">{service.price.toLocaleString('vi-VN')} đ</span>
                  </div>
                  {service.durationMinutes > 0 && (
                    <span className="text-xs font-bold text-[#8a7e75] flex items-center gap-1 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-xl">
                      <Clock size={12} /> {service.durationMinutes} phút
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  )
}
