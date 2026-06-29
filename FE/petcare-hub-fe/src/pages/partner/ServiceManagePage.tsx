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
  Edit2,
  Eye,
  EyeOff
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'

interface Service {
  id: string
  name: string
  description: string
  price: number
  durationMinutes: number
  serviceType: string
  imageUrl?: string
  imageUrls?: string[]
  isEnabled?: boolean
}

export const ServiceManagePage = () => {
  const { user } = useAuthStore()
  const { hotelId } = useParams<{ hotelId: string }>()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  // CRUD States
  const [showModal, setShowModal] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationMinutes: '',
    serviceType: 'SPA',
    imageUrl: '',
    imageUrls: [] as string[]
  })

  const SERVICE_TYPES = ['SPA', 'GROOMING', 'TRANSPORT', 'FOOD', 'MEDICATION']

  const fetchServices = async () => {
    try {
      const response = await axiosInstance.get(`/api/services/hotel/${hotelId}?enabledOnly=false`)
      setServices(response.data || [])
    } catch (error) {
      console.error('Failed to load services', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [hotelId])

  useEffect(() => {
    if (showModal || editService) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal, editService])

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const url = res.data.url
      if (editService) {
        setEditService(prev => prev ? {
          ...prev,
          imageUrls: [...(prev.imageUrls || []), url]
        } : null)
      } else {
        setForm(prev => ({
          ...prev,
          imageUrls: [...(prev.imageUrls || []), url]
        }))
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('Upload ảnh thất bại')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.price) return
    if (Number(form.price) < 0) {
      alert('Giá dịch vụ không được âm!')
      return
    }
    if (Number(form.durationMinutes) < 0) {
      alert('Thời gian dịch vụ không được âm!')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.post(`/api/services/${hotelId}`, {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes) || 0,
        serviceType: form.serviceType,
        imageUrls: form.imageUrls
      })
      await fetchServices()
      setShowModal(false)
      setForm({ name: '', description: '', price: '', durationMinutes: '', serviceType: 'SPA', imageUrl: '', imageUrls: [] })
    } catch (err) {
      console.error('Failed to create service', err)
      alert('Không thể tạo dịch vụ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editService) return
    if (Number(editService.price) < 0) {
      alert('Giá dịch vụ không được âm!')
      return
    }
    if (Number(editService.durationMinutes) < 0) {
      alert('Thời gian dịch vụ không được âm!')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.put(`/api/services/${editService.id}`, {
        name: editService.name,
        description: editService.description,
        price: Number(editService.price),
        durationMinutes: Number(editService.durationMinutes) || 0,
        serviceType: editService.serviceType,
        imageUrls: editService.imageUrls || []
      })
      await fetchServices()
      setEditService(null)
    } catch (err) {
      console.error('Failed to update service', err)
      alert('Không thể cập nhật dịch vụ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (serviceId: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'tạm ngưng' : 'kích hoạt lại'
    if (!confirm(`Bạn có chắc muốn ${actionText} dịch vụ này?`)) return
    try {
      await axiosInstance.patch(`/api/services/${serviceId}/toggle`)
      await fetchServices()
    } catch (err) {
      console.error('Failed to toggle service status', err)
      alert('Không thể thay đổi trạng thái dịch vụ này')
    }
  }

  const getServiceIcon = (type: string, size: number = 20) => {
    switch (type) {
      case 'SPA': return <Sparkles size={size} />
      case 'GROOMING': return <Scissors size={size} />
      case 'TRANSPORT': return <Truck size={size} />
      case 'FOOD': return <Utensils size={size} />
      case 'MEDICATION': return <PlusSquare size={size} />
      default: return <PlusSquare size={size} />
    }
  }

  // Design Tokens
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }

  return (
    <div className="flex-grow flex flex-col min-w-0">

      {/* ── TOP UTILITIES BAR ── */}
      <header className="h-20 bg-white border-b border-[#e5d8d0] px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="w-10 h-10 rounded-full border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-lg font-black tracking-tight text-[#303330]">Cài Đặt Cấu Hình Dịch Vụ</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#8a7e75]">{user?.fullName || 'Đối tác'}</span>
          <div className="w-9 h-9 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center font-black text-xs text-[#fa7150]">
            {user?.fullName?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="p-8 md:p-12 overflow-y-auto flex-grow max-w-7xl w-full mx-auto">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black text-[#303330]">Danh Sách Dịch Vụ Đi Kèm</h2>
            <p className="text-xs text-[#8a7e75]">Cài đặt các gói dịch vụ làm đẹp, trị liệu thủy liệu, đưa đón tận nơi hoặc chế độ ăn đặc biệt.</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-[#fa7150] text-white px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer w-fit"
          >
            <PlusCircle size={16} /> Thêm dịch vụ mới
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-[#8a7e75] font-bold text-sm flex flex-col items-center gap-3 bg-white border border-[#e5d8d0] rounded-3xl">
            <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin"></span>
            Đang tải danh sách dịch vụ...
          </div>
        ) : services.length === 0 ? (
          <div className="py-20 text-center border border-[#e5d8d0] bg-white rounded-[32px] p-8">
            <div className="w-16 h-16 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-[#fa7150] mx-auto mb-4">
              <Sparkles size={28} />
            </div>
            <p className="text-[#8a7e75] font-black text-sm mb-4">Chưa có dịch vụ bổ sung nào được cấu hình cho cơ sở này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-white border border-[#e5d8d0] rounded-[32px] p-8 relative overflow-hidden transition-all duration-300 hover:border-[#fa7150]/30 hover:shadow-xl hover:shadow-[#fa7150]/2 flex flex-col justify-between ${service.isEnabled === false ? 'opacity-80 border-dashed bg-[#faf9f6]/40' : ''
                  }`}
                style={cardShadow}
              >
                <div>
                  {(service.imageUrls && service.imageUrls.length > 0) ? (
                    <div className="relative h-40 overflow-hidden rounded-2xl mb-4 bg-gray-50">
                      <img
                        src={service.imageUrls[0]}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                      {service.imageUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                          + {service.imageUrls.length - 1} ảnh
                        </div>
                      )}
                    </div>
                  ) : service.imageUrl ? (
                    <div className="relative h-40 overflow-hidden rounded-2xl mb-4 bg-gray-50">
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] text-[#fa7150] flex items-center justify-center border border-[#fa7150]/10">
                      {getServiceIcon(service.serviceType)}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-[#303330] line-clamp-1">{service.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[9px] font-black text-[#fa7150] bg-[#fa7150]/10 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                          {service.serviceType}
                        </span>
                        {service.isEnabled !== false ? (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                            Tạm ngưng
                          </span>
                        )}
                        {service.durationMinutes > 0 && (
                          <span className="text-[9px] font-black text-[#8a7e75] bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1">
                            <Clock size={10} /> {service.durationMinutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#5a5550] leading-relaxed mb-6 h-10 line-clamp-2">{service.description || 'Chưa có mô tả chi tiết cho dịch vụ này.'}</p>
                </div>

                <div className="flex justify-between items-center border-t border-[#e5d8d0]/60 pt-4 mt-auto">
                  <div>
                    <span className="text-[10px] text-[#8a7e75] font-black uppercase block mb-0.5">Giá Trọn Gói</span>
                    <span className="text-base font-black text-[#a43e24]">{service.price.toLocaleString('vi-VN')} đ</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditService(service)}
                      className="p-2 rounded-xl bg-[#faf9f6] border border-[#e5d8d0]/60 text-[#8a7e75] hover:text-[#fa7150] transition-all cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.isEnabled !== false)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${service.isEnabled !== false
                          ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      title={service.isEnabled !== false ? "Tạm ngưng dịch vụ" : "Kích hoạt lại"}
                    >
                      {service.isEnabled !== false ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── MODAL TẠO / EDIT SERVICE ── */}
      {(showModal || editService) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl text-left">
            <h3 className="text-xl font-black text-[#303330] mb-6">
              {editService ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
            </h3>

            <div className="space-y-4">
              {/* Image Upload Area */}
              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Hình ảnh dịch vụ (Có thể tải lên nhiều)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {(editService ? editService.imageUrls : form.imageUrls)?.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl border border-[#e5d8d0] overflow-hidden bg-gray-50 group shrink-0">
                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            if (editService) {
                              setEditService(prev => prev ? {
                                ...prev,
                                imageUrls: (prev.imageUrls || []).filter((_, i) => i !== idx)
                              } : null);
                            } else {
                              setForm(prev => ({
                                ...prev,
                                imageUrls: (prev.imageUrls || []).filter((_, i) => i !== idx)
                              }));
                            }
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <label
                      htmlFor="service-image-upload"
                      className="w-16 h-16 rounded-xl border border-dashed border-[#e5d8d0] hover:border-[#fa7150] flex flex-col items-center justify-center text-[#8a7e75] hover:text-[#fa7150] transition-all cursor-pointer bg-[#faf9f6] shrink-0"
                    >
                      <PlusCircle size={20} />
                      <span className="text-[8px] font-bold mt-1">Thêm ảnh</span>
                    </label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    id="service-image-upload"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                      e.target.value = '';
                    }}
                  />
                  {uploadingImage && <span className="text-[10px] text-[#fa7150] font-bold">Đang tải lên...</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Tên dịch vụ *</label>
                <input
                  value={editService ? editService.name : form.name}
                  onChange={e => editService
                    ? setEditService({ ...editService, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Spa thư giãn cho mèo"
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mô tả</label>
                <textarea
                  value={editService ? editService.description : form.description}
                  onChange={e => editService
                    ? setEditService({ ...editService, description: e.target.value })
                    : setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Giá (đ) *</label>
                  <input
                    type="number"
                    min="0"
                    value={editService ? editService.price : form.price}
                    onChange={e => editService
                      ? setEditService({ ...editService, price: Number(e.target.value) })
                      : setForm({ ...form, price: e.target.value })}
                    placeholder="150000"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Thời gian (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={editService ? editService.durationMinutes : form.durationMinutes}
                    onChange={e => editService
                      ? setEditService({ ...editService, durationMinutes: Number(e.target.value) })
                      : setForm({ ...form, durationMinutes: e.target.value })}
                    placeholder="60"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#8a7e75] uppercase mb-2 block">Loại dịch vụ</label>
                <div className="flex gap-2 flex-wrap">
                  {SERVICE_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => editService
                        ? setEditService({ ...editService, serviceType: type })
                        : setForm({ ...form, serviceType: type })}
                      className={`px-3 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${(editService ? editService.serviceType : form.serviceType) === type
                          ? 'bg-[#fa7150] text-white border-[#fa7150]'
                          : 'border-[#e5d8d0] text-[#8a7e75]'
                        }`}
                    >
                      {type === 'SPA' ? <><Sparkles size={14} /> Spa</>
                        : type === 'GROOMING' ? <><Scissors size={14} /> Grooming</>
                          : type === 'TRANSPORT' ? <><Truck size={14} /> Đưa đón</>
                            : type === 'FOOD' ? <><Utensils size={14} /> Thức ăn</>
                              : <><PlusSquare size={14} /> Thuốc</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowModal(false); setEditService(null) }}
                className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
              >
                Hủy
              </button>
              <button
                onClick={editService ? handleUpdate : handleCreate}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ backgroundColor: submitting ? '#ffac98' : '#fa7150' }}
              >
                {submitting ? 'Đang lưu...' : editService ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
