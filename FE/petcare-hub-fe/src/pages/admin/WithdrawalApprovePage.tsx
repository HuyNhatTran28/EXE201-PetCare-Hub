import { useState, useEffect } from 'react'
import { Check, X, ShieldCheck, Loader2, ExternalLink, Image, Upload, FileText, Trash2 } from 'lucide-react'
import axiosInstance from '@/lib/axios'

export const WithdrawalApprovePage = () => {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal approval states
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    fetchWithdrawalRequests()
  }, [])

  const fetchWithdrawalRequests = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/admin/withdrawals')
      setRequests(res.data || [])
    } catch (err) {
      console.error('Failed to fetch admin withdrawals:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper mapping common Vietnamese banks to VietQR API codes
  const getBankCode = (bankName: string) => {
    const name = (bankName || '').toLowerCase()
    if (name.includes('vietcombank') || name === 'vcb') return 'VCB'
    if (name.includes('techcombank') || name === 'tcb') return 'TCB'
    if (name.includes('mbbank') || name === 'mb' || name.includes('quan doi')) return 'MB'
    if (name.includes('bidv')) return 'BIDV'
    if (name.includes('acb')) return 'ACB'
    if (name.includes('sacombank') || name === 'stb') return 'STB'
    if (name.includes('vietinbank') || name === 'ctg') return 'CTG'
    return 'TCB' // Default fallback
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate receipt upload size and type
    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf']
    if (!extension || !allowedExtensions.includes(extension)) {
      alert('Định dạng tài liệu chuyển khoản không hợp lệ. Chỉ chấp nhận định dạng ảnh (.jpg, .jpeg, .png) hoặc tài liệu PDF (.pdf).')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert(`Kích thước tài liệu quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn tệp dưới 5MB.`)
      return
    }

    setUploadingReceipt(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axiosInstance.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setReceiptUrl(res.data.url)
    } catch (err) {
      console.error('Upload receipt failed:', err)
      alert('Không thể tải ảnh biên lai lên. Vui lòng thử lại.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleApprove = async () => {
    if (!receiptUrl.trim()) {
      alert('Vui lòng tải ảnh biên lai chuyển khoản để đối soát.')
      return
    }

    setApproving(true)
    try {
      await axiosInstance.post(`/api/admin/withdrawals/${selectedRequest.id}/approve`, {
        receiptImageUrl: receiptUrl
      })
      alert('Đã duyệt yêu cầu rút tiền thành công!')
      setSelectedRequest(null)
      setReceiptUrl('')
      fetchWithdrawalRequests()
    } catch (err: any) {
      console.error('Approve failed:', err)
      alert(err.response?.data?.message || 'Lỗi duyệt yêu cầu rút tiền.')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối yêu cầu rút tiền này? Số tiền sẽ được hoàn trả lại cho đối tác.')) return
    try {
      await axiosInstance.post(`/api/admin/withdrawals/${id}/reject`)
      alert('Đã từ chối yêu cầu rút tiền.')
      fetchWithdrawalRequests()
    } catch (err: any) {
      console.error('Reject failed:', err)
      alert(err.response?.data?.message || 'Lỗi từ chối yêu cầu rút tiền.')
    }
  }

  const cardShadow = { boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  return (
    <div className="p-8 space-y-8 bg-[#faf9f6] min-h-screen text-[#303330]">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-[#e5d8d0]/60 pb-6">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tight">Duyệt Rút Tiền</h2>
          <p className="text-sm text-[#8a7e75] mt-1 font-bold">Xác nhận chuyển khoản đối soát doanh thu cho đối tác resort.</p>
        </div>
        <div className="bg-white border border-[#e5d8d0] px-4 py-2 rounded-2xl flex items-center gap-2">
          <ShieldCheck className="text-[#fa7150]" size={18} />
          <span className="text-xs font-black uppercase tracking-wider text-[#303330]">Admin Verified Console</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#fa7150]" size={32} />
          <span className="text-xs font-black uppercase text-[#8a7e75]">Đang tải yêu cầu rút tiền...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main request list */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-base font-black uppercase tracking-wider text-[#8a7e75]">Yêu cầu cần xử lý</h3>
            
            {requests.filter(r => r.status === 'PENDING').length === 0 ? (
              <div className="bg-white border border-[#e5d8d0] rounded-3xl p-12 text-center" style={cardShadow}>
                <p className="text-sm font-bold text-[#8a7e75]">Không có yêu cầu rút tiền nào đang chờ duyệt.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {requests.filter(r => r.status === 'PENDING').map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col md:flex-row gap-6 justify-between" style={cardShadow}>
                    <div className="text-left space-y-3.5 flex-grow">
                      <div className="flex justify-between md:justify-start items-center gap-2.5">
                        <span className="text-sm font-black text-[#a43e24]">
                          {r.amount.toLocaleString('vi-VN')} VNĐ
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-black uppercase">
                          Chờ duyệt
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-semibold text-[#8a7e75]">
                        <div>Đối tác: <span className="text-[#303330] font-black">{r.partnerName}</span></div>
                        <div>Email: <span className="text-[#303330] font-bold font-mono">{r.partnerEmail}</span></div>
                        <div>Ngân hàng: <span className="text-[#303330] font-black">{r.bankName}</span></div>
                        <div>Số tài khoản: <span className="text-[#303330] font-bold font-mono">{r.bankAccountNumber}</span></div>
                        <div>Tên thụ hưởng: <span className="text-[#303330] font-black">{r.bankAccountName}</span></div>
                        <div>Gửi lúc: <span className="text-gray-400 font-normal">{new Date(r.createdAt).toLocaleString('vi-VN')}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center justify-center gap-4 shrink-0">
                      {/* VietQR Quick Scan */}
                      <a
                        href={`https://img.vietqr.io/image/${getBankCode(r.bankName)}-${r.bankAccountNumber}-compact2.png?amount=${r.amount}&addInfo=Rut%20Tien%20PetCare&accountName=${encodeURIComponent(r.bankAccountName)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-[#faf9f6] border border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-colors group shrink-0"
                      >
                        <img
                          src={`https://img.vietqr.io/image/${getBankCode(r.bankName)}-${r.bankAccountNumber}-compact2.png?amount=${r.amount}&addInfo=Rut%20Tien%20PetCare&accountName=${encodeURIComponent(r.bankAccountName)}`}
                          alt="VietQR Quick Link"
                          className="w-16 h-16 object-contain rounded-lg group-hover:scale-[1.02] transition-transform"
                        />
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#fa7150] flex items-center gap-0.5">
                          Quét VietQR <ExternalLink size={8} />
                        </span>
                      </a>

                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => handleReject(r.id)}
                          className="flex-1 md:flex-none p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className="flex-1 md:flex-none px-4 py-3 bg-[#fa7150] text-white rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Check size={14} /> Duyệt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History section */}
            <div className="space-y-6 pt-6 border-t border-[#e5d8d0]/60">
              <h3 className="text-base font-black uppercase tracking-wider text-[#8a7e75]">Yêu cầu đã xử lý</h3>
              
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-[#faf9f6] text-[#8a7e75] uppercase text-[9px] font-black border-b border-[#e5d8d0]/60">
                        <th className="p-4">Đối tác / Email</th>
                        <th className="p-4">Số tiền</th>
                        <th className="p-4">Tài khoản thụ hưởng</th>
                        <th className="p-4">Thời gian</th>
                        <th className="p-4">Trạng thái</th>
                        <th className="p-4">Minh chứng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5d8d0]/40">
                      {requests.filter(r => r.status !== 'PENDING').length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#8a7e75] font-bold">Chưa có lịch sử xử lý.</td>
                        </tr>
                      ) : (
                        requests.filter(r => r.status !== 'PENDING').map(r => (
                          <tr key={r.id} className="hover:bg-[#faf9f6]/30 transition-colors">
                            <td className="p-4">
                              <span className="font-black text-[#303330] block">{r.partnerName}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{r.partnerEmail}</span>
                            </td>
                            <td className="p-4 font-black text-[#a43e24]">
                              {r.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="p-4 leading-normal">
                              <span className="font-bold text-[#303330] block">{r.bankName}</span>
                              <span className="text-[10px] text-gray-500 block">{r.bankAccountNumber} - {r.bankAccountName}</span>
                            </td>
                            <td className="p-4 text-gray-400 font-normal">
                              {new Date(r.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${
                                r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {r.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                              </span>
                            </td>
                            <td className="p-4">
                              {r.receiptImageUrl ? (
                                <a
                                  href={r.receiptImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#fa7150] font-black hover:underline flex items-center gap-0.5 text-[10px] uppercase"
                                >
                                  Biên lai <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-gray-400 font-normal">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions and stats */}
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase tracking-wider text-[#8a7e75]">Quy trình đối soát</h3>
            
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 space-y-6 text-xs text-left" style={cardShadow}>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fa7150]/15 text-[#fa7150] flex items-center justify-center font-black shrink-0">1</div>
                  <p className="font-bold text-[#5a5550] leading-relaxed">
                    Nhấn vào mã QR hoặc mở ứng dụng ngân hàng quét mã QR pre-filled của đối tác để tự động điền số tài khoản, số tiền và nội dung đối soát.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fa7150]/15 text-[#fa7150] flex items-center justify-center font-black shrink-0">2</div>
                  <p className="font-bold text-[#5a5550] leading-relaxed">
                    Thực hiện chuyển khoản thành công trên ứng dụng ngân hàng Admin. Chụp lại màn hình biên lai chuyển tiền.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#fa7150]/15 text-[#fa7150] flex items-center justify-center font-black shrink-0">3</div>
                  <p className="font-bold text-[#5a5550] leading-relaxed">
                    Nhấn "Duyệt" trên giao diện Admin, tải ảnh biên lai chuyển tiền lên hệ thống Cloudinary để lưu làm minh chứng pháp lý, sau đó xác nhận hoàn tất.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#e5d8d0]/60" />

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-[#8a7e75] tracking-wider block">Nguyên tắc tài chính</span>
                <p className="text-[10px] font-normal text-gray-500 leading-relaxed">
                  * Hệ thống tự động khấu trừ 8% hoa hồng nền tảng khi thanh toán được ghi nhận. Số tiền yêu cầu rút của đối tác là 92% doanh thu thực nhận đã cộng dồn sau khi check-out thành công.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL WITH RECEIPT UPLOADER */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#303330]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left space-y-6">
            <div className="border-b border-[#e5d8d0]/60 pb-4">
              <h3 className="text-xl font-black text-[#303330]">Duyệt yêu cầu rút tiền</h3>
              <p className="text-xs text-[#8a7e75] mt-1">
                Tải biên lai đối soát cho đối tác <span className="font-bold text-[#303330]">{selectedRequest.partnerName}</span> số tiền <span className="text-[#a43e24] font-black">{selectedRequest.amount.toLocaleString('vi-VN')} VNĐ</span>.
              </p>
            </div>

            {/* Receipt Uploader */}
            <div className="space-y-4">
              <span className="block text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">Minh chứng chuyển khoản (Biên lai)</span>
              
              <label className="cursor-pointer h-40 bg-[#faf9f6] hover:bg-[#fa7150]/5 border-2 border-dashed border-[#e5d8d0] hover:border-[#fa7150] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#8a7e75] transition-colors relative overflow-hidden">
                <input 
                  type="file" 
                  accept=".png,.jpg,.jpeg,.pdf" 
                  className="hidden" 
                  disabled={uploadingReceipt || approving}
                  onChange={handleFileUpload}
                />
                
                {uploadingReceipt && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-1.5 z-20">
                    <Loader2 className="animate-spin text-[#fa7150]" size={24} />
                    <span className="text-[10px] font-bold text-[#fa7150] uppercase tracking-wider animate-pulse">Đang tải biên lai...</span>
                  </div>
                )}

                {receiptUrl ? (
                  <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                    <Check className="text-emerald-500 mb-1" size={24} />
                    <span className="text-xs font-black text-emerald-700 block mb-1">ĐÃ TẢI BIÊN LAI THÀNH CÔNG</span>
                    <span className="text-[9px] text-[#8a7e75] block truncate max-w-[200px]">{receiptUrl.split('/').pop()}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-[#fa7150]" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Tải biên lai (Ảnh/PDF dưới 5MB)</span>
                  </>
                )}
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5d8d0]/60 font-bold text-xs">
              <button
                onClick={() => { setSelectedRequest(null); setReceiptUrl(''); }}
                disabled={approving || uploadingReceipt}
                className="px-5 py-3 bg-[#f5ede8] hover:bg-[#e5d8d0] text-[#5a5550] rounded-xl cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || uploadingReceipt || !receiptUrl}
                style={orangeGradient}
                className="px-6 py-3 text-white rounded-xl cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {approving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Đang duyệt...</span>
                  </>
                ) : (
                  <span>Hoàn tất & Duyệt</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
