import { Hammer, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export const AuditLogPage = () => {
  return (
    <div className="p-10 min-h-screen flex items-center justify-center bg-[#faf9f6]">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#e5d8d0] p-10 text-center shadow-xl shadow-[#fa7150]/5">
        <div className="w-16 h-16 bg-[#fff0e6] text-[#fa7150] rounded-full flex items-center justify-center mx-auto mb-6">
          <Hammer size={32} />
        </div>
        <h1 className="text-3xl font-black text-[#303330] mb-2">Tính năng đang phát triển</h1>
        <p className="text-xs text-[#8a7e75] leading-relaxed mb-8">
          Hệ thống Nhật ký Hoạt động (Audit Log) đang được cập nhật và tích hợp cơ sở dữ liệu thời gian thực. Tính năng này sẽ sớm ra mắt!
        </p>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 bg-[#fa7150] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#fa7150]/90 transition-all cursor-pointer shadow-lg shadow-[#fa7150]/20"
        >
          <ArrowLeft size={14} /> Quay lại Dashboard
        </Link>
      </div>
    </div>
  )
}
