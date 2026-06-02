import { useState, useEffect } from 'react'
import {
  Building, Search, RefreshCw, CheckCircle,
  XCircle, Ban, Star, MapPin
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:  { label: 'Chờ duyệt',   bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  ACTIVE:   { label: 'Hoạt động',   bg: 'bg-emerald-50 border-emerald-200',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  REJECTED: { label: 'Từ chối',     bg: 'bg-rose-50 border-rose-200',    text: 'text-rose-600',   dot: 'bg-rose-500' },
}

const TABS = ['ALL', 'PENDING', 'ACTIVE', 'REJECTED']

export const HotelApprovePage = () => {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchHotels = async () => {
    setLoading(true)
    try {
      const params: any = { page: 0, size: 100 }
      if (activeTab !== 'ALL') {
        params.status = activeTab
      }
      const res = await axiosInstance.get('/api/hotels', { params })
      setHotels(res.data.content || [])
    } catch (err) {
      console.error('Failed to load hotels', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotels()
  }, [activeTab])

  const handleUpdateStatus = async (hotelId: string, status: 'ACTIVE' | 'REJECTED' | 'PENDING') => {
    const actionLabel = status === 'ACTIVE' ? 'duyệt hoạt động' : status === 'REJECTED' ? 'từ chối' : 'tạm dừng'
    if (!confirm(`Bạn có chắc muốn ${actionLabel} khách sạn này?`)) return
    setProcessing(hotelId)
    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/status?status=${status}`)
      setHotels(prev => prev.map(h =>
        h.id === hotelId ? { ...h, status } : h
      ))
    } catch (err) {
      alert('Không thể cập nhật trạng thái khách sạn')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = hotels.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    (h.address || '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = TABS.reduce((acc, tab) => ({
    ...acc,
    [tab]: tab === 'ALL' ? hotels.length : hotels.filter(h => h.status === tab).length
  }), {} as Record<string, number>)

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Quản trị hệ thống</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Quản lý Khách Sạn</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Phê duyệt, từ chối và quản lý danh sách khách sạn đối tác</p>
        </div>
        <button onClick={fetchHotels}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {TABS.map((tab, i) => {
          const cfg = STATUS_CONFIG[tab]
          return (
            <div key={i} className="bg-white p-6 rounded-3xl border border-[#e5d8d0]" style={cardShadow}>
              <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
                {tab === 'ALL' ? 'Tất cả khách sạn' : cfg?.label}
              </p>
              <p className="text-3xl font-black text-[#303330]">{loading ? '—' : counts[tab]}</p>
            </div>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm khách sạn..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const cfg = STATUS_CONFIG[tab]
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === tab
                    ? 'bg-[#fa7150] text-white border-[#fa7150]'
                    : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : cfg?.label}
                <span className="ml-1.5 opacity-70">({counts[tab]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Khách sạn', 'Địa chỉ', 'Đánh giá', 'Loại thú cưng', 'Trạng thái', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5d8d0]/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <Building size={40} className="text-[#e5d8d0] mx-auto mb-3" />
                  <p className="text-[#8a7e75] font-bold text-sm">Không có khách sạn nào</p>
                </td>
              </tr>
            ) : (
              filtered.map(hotel => {
                const cfg = STATUS_CONFIG[hotel.status] || STATUS_CONFIG.PENDING
                return (
                  <tr key={hotel.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                    {/* Hotel info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#faf9f6] border border-[#e5d8d0] shrink-0">
                          <img 
                            src={hotel.images && hotel.images.length > 0 ? hotel.images[0] : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800'} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#303330]">{hotel.name}</p>
                          <p className="text-[10px] text-[#8a7e75] font-semibold">{hotel.phone || 'Chưa có SĐT'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="p-4">
                      <p className="text-xs text-[#5a5550] flex items-center gap-1">
                        <MapPin size={12} className="text-[#fa7150]" /> {hotel.address || 'Hồ Chí Minh, Việt Nam'}
                      </p>
                    </td>

                    {/* Rating */}
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black text-[#303330]">{hotel.averageRating || '—'}</span>
                      </div>
                    </td>

                    {/* Allowed pets */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(hotel.allowedPetTypes || ['Dogs', 'Cats']).map((tag: string, idx: number) => (
                          <span key={idx} className="bg-purple-50 text-purple-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex gap-2">
                        {hotel.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(hotel.id, 'ACTIVE')}
                              disabled={processing === hotel.id}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                            >
                              <CheckCircle size={12} /> Duyệt
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(hotel.id, 'REJECTED')}
                              disabled={processing === hotel.id}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
                            >
                              <XCircle size={12} /> Từ chối
                            </button>
                          </>
                        )}
                        {hotel.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateStatus(hotel.id, 'PENDING')}
                            disabled={processing === hotel.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all"
                          >
                            <Ban size={12} /> Tạm ngưng
                          </button>
                        )}
                        {hotel.status === 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(hotel.id, 'PENDING')}
                            disabled={processing === hotel.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-stone-200 text-[#8a7e75] hover:bg-[#faf9f6] transition-all"
                          >
                            <RefreshCw size={12} /> Khôi phục
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
