import { useState, useEffect } from 'react'
import {
  MessageSquare, Trash2, Search, RefreshCw, AlertCircle,
  HelpCircle, Sparkles, AlertTriangle
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface Feedback {
  id: string
  category: string
  content: string
  senderEmail: string | null
  senderIp: string
  createdAt: string
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  BUG: {
    label: 'Báo lỗi',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
    icon: <AlertTriangle size={12} className="text-rose-500" />
  },
  FEATURE_REQUEST: {
    label: 'Tính năng mới',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    icon: <Sparkles size={12} className="text-emerald-500" />
  },
  GENERAL: {
    label: 'Góp ý chung',
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-200',
    icon: <HelpCircle size={12} className="text-stone-500" />
  }
}

const TABS = ['ALL', 'BUG', 'FEATURE_REQUEST', 'GENERAL']

export const FeedbackManagePage = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchFeedbacks = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/admin/feedbacks')
      setFeedbacks(res.data.data || [])
    } catch (err) {
      console.error('Failed to load feedbacks', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa/đóng góp ý này?')) return
    setProcessing(id)
    try {
      await axiosInstance.delete(`/api/admin/feedbacks/${id}`)
      setFeedbacks(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      alert('Không thể xóa góp ý này. Vui lòng thử lại.')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = feedbacks.filter(f => {
    const matchesTab = activeTab === 'ALL' || f.category === activeTab
    const matchesSearch = f.content?.toLowerCase().includes(search.toLowerCase()) ||
      (f.senderEmail && f.senderEmail.toLowerCase().includes(search.toLowerCase())) ||
      f.senderIp?.includes(search)
    return matchesTab && matchesSearch
  })

  const counts = TABS.reduce((acc, tab) => ({
    ...acc,
    [tab]: tab === 'ALL' ? feedbacks.length : feedbacks.filter(f => f.category === tab).length
  }), {} as Record<string, number>)

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Trợ lý AI thu thập</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Ý kiến đóng góp</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Quản lý và giải quyết các đề xuất, báo lỗi từ người dùng qua chatbot</p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {TABS.map((tab, i) => {
          const config = CATEGORY_CONFIG[tab]
          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-[#e5d8d0] text-center" style={cardShadow}>
              <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
                {tab === 'ALL' ? 'Tất cả góp ý' : config?.label}
              </p>
              <p className="text-2xl font-black text-[#303330]">{loading ? '—' : counts[tab]}</p>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nội dung, email hoặc IP..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const config = CATEGORY_CONFIG[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === tab
                    ? 'bg-[#fa7150] text-white border-[#fa7150]'
                    : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : config?.label}
                <span className="ml-1.5 opacity-70">({counts[tab]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid/Table content */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Phân loại', 'Nội dung phản hồi', 'Người gửi', 'Thời gian', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5d8d0]/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <MessageSquare size={40} className="text-[#e5d8d0] mx-auto mb-3" />
                  <p className="text-[#8a7e75] font-bold text-sm">Không có ý kiến đóng góp nào</p>
                </td>
              </tr>
            ) : (
              filtered.map(fb => {
                const config = CATEGORY_CONFIG[fb.category] || CATEGORY_CONFIG.GENERAL
                return (
                  <tr key={fb.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                    {/* Category */}
                    <td className="p-4 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
                        {config.icon}
                        {config.label}
                      </span>
                    </td>

                    {/* Content */}
                    <td className="p-4 max-w-sm">
                      <p className="text-xs text-[#303330] leading-relaxed font-bold break-words">{fb.content}</p>
                    </td>

                    {/* Sender details */}
                    <td className="p-4">
                      {fb.senderEmail ? (
                        <div>
                          <p className="text-xs font-bold text-[#303330]">{fb.senderEmail}</p>
                          <p className="text-[10px] text-[#8a7e75] mt-0.5">IP: {fb.senderIp}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-stone-400 italic">Ẩn danh</p>
                          <p className="text-[10px] text-[#8a7e75] mt-0.5">IP: {fb.senderIp}</p>
                        </div>
                      )}
                    </td>

                    {/* Sent time */}
                    <td className="p-4">
                      <p className="text-xs text-[#8a7e75]">
                        {new Date(fb.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(fb.id)}
                        disabled={processing === fb.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        {processing === fb.id ? 'Đang xóa...' : 'Đã giải quyết'}
                      </button>
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
