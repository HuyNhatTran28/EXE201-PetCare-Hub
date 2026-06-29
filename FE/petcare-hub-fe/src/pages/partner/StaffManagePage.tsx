import { useState, useEffect, useCallback } from 'react'
import { Users, PlusCircle, RefreshCw, ToggleLeft, ToggleRight, X, Mail, Building } from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface HotelOption {
  id: string
  name: string
  status: string
}

interface StaffMember {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string | null
  isActive: boolean
  jobPosition: string | null
  workplaceId: string
  workplaceName: string
  createdAt: string
}

export const StaffManagePage = () => {
  const [hotels, setHotels]               = useState<HotelOption[]>([])
  const [hotelsLoading, setHotelsLoading] = useState(true)
  const [selectedHotelId, setSelectedHotelId] = useState<string>('')
  const [staffList, setStaffList]         = useState<StaffMember[]>([])
  const [loading, setLoading]             = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [successEmail, setSuccessEmail]   = useState<string | null>(null)

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', jobPosition: '' })
  const [formError, setFormError]   = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  // ── Load danh sách khách sạn (dùng cùng pattern với PartnerDashboard) ──────
  useEffect(() => {
    axiosInstance
      .get('/api/hotels/my', { params: { page: 0, size: 20, sort: [] } })
      .then(res => {
        const list: HotelOption[] = res.data.content || []
        setHotels(list)
        if (list.length > 0) setSelectedHotelId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setHotelsLoading(false))
  }, [])

  // ── Fetch nhân viên theo cơ sở đang chọn ─────────────────────────────────
  const fetchStaff = useCallback(() => {
    if (!selectedHotelId) return
    setLoading(true)
    axiosInstance
      .get('/api/staff', { params: { hotelId: selectedHotelId } })
      .then(res => setStaffList(res.data?.data ?? []))
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false))
  }, [selectedHotelId])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal])

  const handleToggle = async (staffId: string) => {
    try {
      const res = await axiosInstance.patch(`/api/staff/${staffId}/toggle-active`)
      const updated: StaffMember = res.data?.data
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, isActive: updated.isActive } : s))
    } catch {
      alert('Không thể thay đổi trạng thái nhân viên.')
    }
  }

  const openModal = () => {
    setForm({ fullName: '', email: '', phone: '', jobPosition: '' })
    setFormError(null)
    setShowModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.fullName.trim() || !form.email.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.post('/api/staff', {
        fullName:    form.fullName.trim(),
        email:       form.email.trim(),
        phone:       form.phone.trim() || null,
        hotelId:     selectedHotelId,
        jobPosition: form.jobPosition.trim() || null,
      })
      setSuccessEmail(form.email.trim())
      setShowModal(false)
      fetchStaff()
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Tạo tài khoản thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedHotel = hotels.find(h => h.id === selectedHotelId)

  return (
    <div className="p-8 md:p-12 overflow-y-auto flex-grow max-w-7xl w-full mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={orangeGradient}>
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#303330]">Quản lý nhân viên</h1>
            <p className="text-xs text-[#8a7e75]">Tạo và quản lý tài khoản nhân viên cho khách sạn</p>
          </div>
        </div>

        {hotels.length > 0 && (
          <button
            onClick={openModal}
            disabled={!selectedHotelId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-opacity"
            style={orangeGradient}
          >
            <PlusCircle size={16} /> Thêm nhân viên
          </button>
        )}
      </div>

      {/* ── Hotel Selector — dùng cùng pattern "Chọn cơ sở quản lý" PartnerDashboard ── */}
      {hotelsLoading ? (
        <div className="flex items-center gap-3 bg-white border border-[#e5d8d0] rounded-2xl px-6 py-3.5 mb-8 shadow-sm">
          <RefreshCw size={14} className="animate-spin text-[#8a7e75]" />
          <span className="text-xs text-[#8a7e75] font-bold">Đang tải danh sách cơ sở...</span>
        </div>
      ) : hotels.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-8 flex items-center gap-3">
          <Building size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-700">
            Bạn chưa có cơ sở nào. Hãy đăng ký khách sạn trước khi tạo nhân viên.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 bg-white border border-[#e5d8d0] rounded-2xl px-6 py-3.5 shadow-sm mb-8 text-left">
          <div className="flex items-center gap-2.5">
            <Building size={18} className="text-[#fa7150]" />
            <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Chọn cơ sở quản lý:</span>
            <select
              value={selectedHotelId}
              onChange={e => setSelectedHotelId(e.target.value)}
              className="bg-transparent border-none text-sm font-black text-[#303330] focus:outline-none cursor-pointer hover:text-[#fa7150] transition-colors"
            >
              {hotels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          {selectedHotel && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-[#8a7e75] uppercase tracking-wider">
              <span>Trạng thái:</span>
              <span className={`px-2.5 py-0.5 rounded-full border ${
                selectedHotel.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {selectedHotel.status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Email-sent notification ───────────────────────────────────────── */}
      {successEmail && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Mail size={18} className="text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">Tài khoản đã được tạo thành công!</p>
            <p className="text-xs text-green-700 mt-0.5">
              Thông tin đăng nhập và mật khẩu tạm thời đã được gửi tới email{' '}
              <span className="font-semibold">{successEmail}</span>. Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
            </p>
          </div>
          <button onClick={() => setSuccessEmail(null)} className="text-green-500 hover:text-green-800 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Staff table (chỉ hiện khi đã chọn được cơ sở) ───────────────── */}
      {hotels.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#8a7e75]">
              <RefreshCw size={20} className="animate-spin mr-2" /> Đang tải...
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-16 text-center text-[#8a7e75]">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Chưa có nhân viên nào</p>
              <p className="text-xs mt-1">Nhấn "Thêm nhân viên" để tạo tài khoản mới</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f6] border-b border-[#e5d8d0]">
                <tr>
                  {['Họ tên', 'Email', 'SĐT', 'Vị trí', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-[#5a5550]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id} className="border-b border-[#e5d8d0]/50 last:border-0 hover:bg-[#faf9f6]/50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-[#303330]">{s.fullName}</td>
                    <td className="px-5 py-3.5 text-[#5a5550]">{s.email}</td>
                    <td className="px-5 py-3.5 text-[#5a5550]">{s.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-[#5a5550]">{s.jobPosition ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        s.isActive ? 'bg-green-100 text-green-700' : 'bg-[#e5d8d0] text-[#8a7e75]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-[#8a7e75]'}`} />
                        {s.isActive ? 'Đang làm' : 'Đã nghỉ'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#8a7e75] text-xs">
                      {new Date(s.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(s.id)}
                        title={s.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                        className="text-[#8a7e75] hover:text-[#fa7150] transition-colors"
                      >
                        {s.isActive
                          ? <ToggleRight size={22} className="text-green-500" />
                          : <ToggleLeft size={22} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl border border-[#e5d8d0] w-full max-w-md p-7 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-[#303330]">Thêm nhân viên mới</h2>
                {selectedHotel && (
                  <p className="text-[11px] text-[#8a7e75] mt-0.5">
                    Cơ sở: <span className="font-bold text-[#fa7150]">{selectedHotel.name}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#8a7e75] hover:text-[#303330]">
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5">
              <Mail size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Mật khẩu tạm sẽ được hệ thống tự sinh và gửi trực tiếp tới email nhân viên. Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
              </p>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Họ tên *',          key: 'fullName',    placeholder: 'Nguyễn Văn A',                    type: 'text'  },
                { label: 'Email *',            key: 'email',       placeholder: 'nhanvien@gmail.com',              type: 'email' },
                { label: 'Số điện thoại',      key: 'phone',       placeholder: '0901234567',                      type: 'tel'   },
                { label: 'Vị trí công việc',   key: 'jobPosition', placeholder: 'Nhân viên chăm sóc thú cưng',     type: 'text'  },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-[#5a5550] mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#e5d8d0] bg-[#faf9f6] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa7150]/30 focus:border-[#fa7150]"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#5a5550] hover:bg-[#faf9f6] transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60"
                  style={orangeGradient}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
