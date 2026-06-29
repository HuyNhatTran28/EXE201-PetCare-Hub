import { useState, useEffect } from 'react'
import { Tag, PlusCircle, ToggleLeft, ToggleRight, Percent, DollarSign } from 'lucide-react'
import axiosInstance from '@/lib/axios'

export const MarketingPage = () => {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    voucherCode: '',
    discountType: 'PERCENT',
    discountValue: '',
    maxUsageCount: '',
    expiresOn: '',
  })

  const fetchVouchers = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/vouchers', { params: { page: 0, size: 50 } })
      setVouchers(res.data.content || [])
    } catch (err) {
      console.error('Failed to load vouchers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVouchers() }, [])

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

  const handleCreate = async () => {
    if (!form.voucherCode || !form.discountValue) return
    setSubmitting(true)
    try {
      await axiosInstance.post('/api/vouchers', {
        voucherCode: form.voucherCode.toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUsageCount: form.maxUsageCount ? Number(form.maxUsageCount) : null,
        expiresOn: form.expiresOn || null,
        voucherStatus: 'ACTIVE',
        currentUsageCount: 0,
      })
      await fetchVouchers()
      setShowModal(false)
      setForm({ voucherCode: '', discountType: 'PERCENT', discountValue: '', maxUsageCount: '', expiresOn: '' })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo voucher')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (voucher: any) => {
    const newStatus = voucher.voucherStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'
    try {
      await axiosInstance.patch(`/api/vouchers/${voucher.id}/status?status=${newStatus}`)
      setVouchers(prev => prev.map(v =>
        v.id === voucher.id ? { ...v, voucherStatus: newStatus } : v
      ))
    } catch {
      alert('Không thể thay đổi trạng thái voucher')
    }
  }

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Marketing</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Voucher & Khuyến mãi</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Tạo và quản lý mã giảm giá cho toàn nền tảng</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-xs font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }}
        >
          <PlusCircle size={16} /> Tạo voucher mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Tổng voucher', value: vouchers.length, color: 'text-[#303330]', bg: 'bg-white' },
          { label: 'Đang hoạt động', value: vouchers.filter(v => v.voucherStatus === 'ACTIVE').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Đã vô hiệu hóa', value: vouchers.filter(v => v.voucherStatus !== 'ACTIVE').length, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-6 rounded-3xl border border-[#e5d8d0]`} style={cardShadow}>
            <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Voucher list */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <div className="p-6 border-b border-[#e5d8d0] flex items-center justify-between">
          <h2 className="font-black text-[#303330] flex items-center gap-2">
            <Tag size={18} className="text-[#fa7150]" /> Danh sách Voucher
          </h2>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Mã voucher', 'Loại', 'Giá trị', 'Đã dùng', 'Hạn dùng', 'Trạng thái', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5d8d0]/60">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
              </td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Tag size={36} className="text-[#e5d8d0] mx-auto mb-3" />
                <p className="text-[#8a7e75] font-bold text-sm">Chưa có voucher nào</p>
              </td></tr>
            ) : vouchers.map(v => (
              <tr key={v.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                <td className="p-4">
                  <span className="font-black text-sm text-[#fa7150] font-mono">{v.voucherCode}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
                    v.discountType === 'PERCENT' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                    {v.discountType === 'PERCENT' ? <Percent size={10}/> : <DollarSign size={10}/>}
                    {v.discountType === 'PERCENT' ? 'Phần trăm' : 'Cố định'}
                  </span>
                </td>
                <td className="p-4 font-black text-sm text-[#303330]">
                  {v.discountType === 'PERCENT'
                    ? `${v.discountValue}%`
                    : `${Number(v.discountValue).toLocaleString('vi-VN')}đ`
                  }
                </td>
                <td className="p-4 text-xs text-[#5a5550]">
                  {v.currentUsageCount || 0} / {v.maxUsageCount || '∞'}
                </td>
                <td className="p-4 text-xs text-[#5a5550]">
                  {v.expiresOn || 'Không giới hạn'}
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                    v.voucherStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {v.voucherStatus === 'ACTIVE' ? 'Hoạt động' : 'Đã tắt'}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => handleToggle(v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                      v.voucherStatus === 'ACTIVE'
                        ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {v.voucherStatus === 'ACTIVE'
                      ? <><ToggleRight size={12}/> Tắt</>
                      : <><ToggleLeft size={12}/> Bật</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal tạo voucher */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-[#303330] mb-6">Tạo Voucher mới</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mã voucher *</label>
                <input
                  value={form.voucherCode}
                  onChange={e => setForm({...form, voucherCode: e.target.value.toUpperCase()})}
                  placeholder="VD: SUMMER2026"
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150] font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Loại giảm giá</label>
                <div className="flex gap-2">
                  {[
                    { value: 'PERCENT', label: '% Phần trăm', icon: <Percent size={14}/> },
                    { value: 'FIXED',   label: 'Tiền cố định', icon: <DollarSign size={14}/> },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({...form, discountType: opt.value})}
                      className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                        form.discountType === opt.value
                          ? 'bg-[#fa7150] text-white border-[#fa7150]'
                          : 'border-[#e5d8d0] text-[#8a7e75]'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">
                    Giá trị {form.discountType === 'PERCENT' ? '(%)' : '(đ)'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={e => setForm({...form, discountValue: e.target.value})}
                    placeholder={form.discountType === 'PERCENT' ? '10' : '50000'}
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Số lượt dùng</label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxUsageCount}
                    onChange={e => setForm({...form, maxUsageCount: e.target.value})}
                    placeholder="Không giới hạn"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Ngày hết hạn</label>
                <input
                  type="date"
                  value={form.expiresOn}
                  onChange={e => setForm({...form, expiresOn: e.target.value})}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button onClick={handleCreate} disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold transition-all"
                style={{ backgroundColor: submitting ? '#ffac98' : '#fa7150' }}
              >
                {submitting ? 'Đang tạo...' : 'Tạo voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
