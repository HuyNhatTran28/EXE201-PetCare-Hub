import { useState, useEffect } from 'react'
import { FileText, Search, RefreshCw, User, Building, Calendar, Tag } from 'lucide-react'
import axiosInstance from '@/lib/axios'

const ACTION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CREATE:  { label: 'Tạo mới',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
  UPDATE:  { label: 'Cập nhật',   bg: 'bg-blue-50',    text: 'text-blue-700'    },
  DELETE:  { label: 'Xóa',        bg: 'bg-rose-50',    text: 'text-rose-600'    },
  LOGIN:   { label: 'Đăng nhập',  bg: 'bg-purple-50',  text: 'text-purple-700'  },
  APPROVE: { label: 'Duyệt',      bg: 'bg-teal-50',    text: 'text-teal-700'    },
  REJECT:  { label: 'Từ chối',    bg: 'bg-amber-50',   text: 'text-amber-700'   },
}

export const AuditLogPage = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/admin/audit-logs', {
        params: { page: 0, size: 50 }
      })
      setLogs(res.data.content || [])
    } catch (err) {
      // Nếu BE chưa có endpoint thì dùng mock data
      setLogs(MOCK_LOGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = logs
    .filter(l => filterAction === 'ALL' || l.action === filterAction)
    .filter(l =>
      l.actorName?.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase())
    )

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Hệ thống</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Nhật ký Hệ thống</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Theo dõi tất cả hoạt động quan trọng trong nền tảng</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên người dùng hoặc mô tả..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', ...Object.keys(ACTION_CONFIG)].map(action => (
            <button key={action} onClick={() => setFilterAction(action)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                filterAction === action
                  ? 'bg-[#fa7150] text-white border-[#fa7150]'
                  : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
              }`}
            >
              {action === 'ALL' ? 'Tất cả' : ACTION_CONFIG[action]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <div className="p-6 border-b border-[#e5d8d0]">
          <h2 className="font-black text-[#303330] flex items-center gap-2">
            <FileText size={18} className="text-[#fa7150]" />
            {filtered.length} bản ghi
          </h2>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText size={40} className="text-[#e5d8d0] mx-auto mb-3" />
            <p className="text-[#8a7e75] font-bold text-sm">Không có bản ghi nào</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5d8d0]/60">
            {filtered.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE
              return (
                <div key={log.id || i} className="p-5 hover:bg-[#faf9f6]/50 transition-colors flex items-start gap-4">

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    {log.entityType === 'USER' ? <User size={16} className={cfg.text} />
                      : log.entityType === 'HOTEL' ? <Building size={16} className={cfg.text} />
                      : log.entityType === 'BOOKING' ? <Calendar size={16} className={cfg.text} />
                      : <Tag size={16} className={cfg.text} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-sm text-[#303330]">{log.actorName || 'Hệ thống'}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {log.entityType && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#faf9f6] text-[#8a7e75] border border-[#e5d8d0]">
                          {log.entityType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5a5550]">{log.description || log.details || '—'}</p>
                    {log.entityId && (
                      <p className="text-[10px] text-[#8a7e75] mt-0.5 font-mono">ID: {log.entityId}</p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-[#8a7e75]">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString('vi-VN', {
                            day:'2-digit', month:'2-digit',
                            hour:'2-digit', minute:'2-digit'
                          })
                        : '—'}
                    </p>
                    {log.ipAddress && (
                      <p className="text-[10px] text-[#8a7e75] mt-0.5">{log.ipAddress}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock data dùng khi BE chưa có audit endpoint
const MOCK_LOGS = [
  { id:'1', actorName:'admin@petcare.com', action:'APPROVE', entityType:'HOTEL', description:'Duyệt khách sạn Nemo Pet', createdAt: new Date().toISOString() },
  { id:'2', actorName:'partner@gmail.com', action:'CREATE', entityType:'BOOKING', description:'Tạo booking mới INV-001', createdAt: new Date(Date.now()-3600000).toISOString() },
  { id:'3', actorName:'System', action:'UPDATE', entityType:'BOOKING', description:'Booking CONFIRMED → CHECKED_IN', createdAt: new Date(Date.now()-7200000).toISOString() },
  { id:'4', actorName:'admin@petcare.com', action:'CREATE', entityType:'VOUCHER', description:'Tạo voucher SUMMER2026 giảm 15%', createdAt: new Date(Date.now()-86400000).toISOString() },
  { id:'5', actorName:'partner@gmail.com', action:'UPDATE', entityType:'HOTEL', description:'Cập nhật thông tin KS Nemo Pet', createdAt: new Date(Date.now()-172800000).toISOString() },
]
