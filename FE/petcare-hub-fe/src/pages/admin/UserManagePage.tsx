import { useState, useEffect } from 'react'
import {
  Users, Search, RefreshCw, ShieldOff,
  ShieldCheck, Crown, Building, User, Wrench
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  OWNER:   { label: 'Owner',   bg: 'bg-purple-50', text: 'text-purple-700', icon: <User size={12}/> },
  PARTNER: { label: 'Partner', bg: 'bg-teal-50',   text: 'text-teal-700',   icon: <Building size={12}/> },
  STAFF:   { label: 'Staff',   bg: 'bg-amber-50',  text: 'text-amber-700',  icon: <Wrench size={12}/> },
  ADMIN:   { label: 'Admin',   bg: 'bg-red-50',    text: 'text-red-700',    icon: <Crown size={12}/> },
}

const TABS = ['ALL', 'OWNER', 'PARTNER', 'STAFF', 'ADMIN']

export const UserManagePage = () => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params: any = { page: 0, size: 100 }
      if (activeTab !== 'ALL') params.role = activeTab
      const res = await axiosInstance.get('/api/admin/users', { params })
      setUsers(res.data.content || [])
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [activeTab])

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    if (!confirm(`Bạn có chắc muốn ${currentActive ? 'khóa' : 'mở khóa'} tài khoản này?`)) return
    setProcessing(userId)
    try {
      await axiosInstance.patch(`/api/admin/users/${userId}/status?active=${!currentActive}`)
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isActive: !currentActive } : u
      ))
    } catch {
      alert('Không thể thay đổi trạng thái tài khoản')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const counts = TABS.reduce((acc, tab) => ({
    ...acc,
    [tab]: tab === 'ALL' ? users.length : users.filter(u => u.role === tab).length
  }), {} as Record<string, number>)

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Quản trị hệ thống</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Quản lý Người dùng</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Xem, khóa và quản lý tất cả tài khoản trong hệ thống</p>
        </div>
        <button onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {TABS.map((tab, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-[#e5d8d0] text-center" style={cardShadow}>
            <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
              {tab === 'ALL' ? 'Tất cả' : ROLE_CONFIG[tab]?.label}
            </p>
            <p className="text-2xl font-black text-[#303330]">{loading ? '—' : counts[tab]}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên hoặc email..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeTab === tab
                  ? 'bg-[#fa7150] text-white border-[#fa7150]'
                  : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
              }`}
            >
              {tab === 'ALL' ? 'Tất cả' : ROLE_CONFIG[tab]?.label}
              <span className="ml-1.5 opacity-70">({counts[tab]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Người dùng', 'Email', 'Role', 'Trạng thái', 'Xác thực', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">
                  {h}
                </th>
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
                  <Users size={40} className="text-[#e5d8d0] mx-auto mb-3" />
                  <p className="text-[#8a7e75] font-bold text-sm">Không có người dùng nào</p>
                </td>
              </tr>
            ) : (
              filtered.map(user => {
                const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.OWNER
                return (
                  <tr key={user.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                    {/* Avatar + Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#faf9f6] border border-[#e5d8d0] flex items-center justify-center shrink-0">
                          {user.avatarUrl
                            ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-sm font-black text-[#fa7150]">{user.fullName?.charAt(0)}</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#303330]">{user.fullName || '—'}</p>
                          <p className="text-[10px] text-[#8a7e75]">{user.phone || 'Chưa có SĐT'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4">
                      <p className="text-xs text-[#5a5550]">{user.email}</p>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full ${roleCfg.bg} ${roleCfg.text}`}>
                        {roleCfg.icon} {roleCfg.label}
                      </span>
                    </td>

                    {/* Active status */}
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-600'
                      }`}>
                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>

                    {/* Verified */}
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                        user.isVerified
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      {user.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                          disabled={processing === user.id}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                            user.isActive
                              ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.isActive
                            ? <><ShieldOff size={12}/> Khóa</>
                            : <><ShieldCheck size={12}/> Mở khóa</>
                          }
                        </button>
                      )}
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
