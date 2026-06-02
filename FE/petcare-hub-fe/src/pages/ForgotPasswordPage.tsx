import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, PawPrint, CheckCircle } from 'lucide-react'
import axiosInstance from '@/lib/axios'

export const ForgotPasswordPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [step, setStep] = useState(1) // 1: Email, 2: OTP, 3: Reset Password
    
    // Form fields
    const [email, setEmail] = useState('')

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email)
        }
    }, [location.state])

    const [otp, setOtp] = useState('')
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''))
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    
    // UI feedback / loading states
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown <= 0) return
        const timer = setInterval(() => {
            setCountdown(prev => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [countdown])

    // Step 1: Send OTP code to email
    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setError('')
        setSuccess('')
        
        if (!email) {
            setError('Vui lòng nhập email của bạn.')
            return
        }

        setIsLoading(true)
        try {
            await axiosInstance.post(`/api/auth/forgot-password/otp?email=${encodeURIComponent(email)}`)
            setSuccess('Mã xác nhận khôi phục mật khẩu đã được gửi đến email của bạn.')
            setCountdown(90) // 1m30s
            setStep(2)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Không thể gửi mã xác nhận. Vui lòng kiểm tra lại email.')
        } finally {
            setIsLoading(false)
        }
    }

    // OTP field handlers
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return
        const newOtpValues = [...otpValues]
        newOtpValues[index] = value.slice(-1)
        setOtpValues(newOtpValues)
        setOtp(newOtpValues.join(''))

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-input-${index + 1}`)
            nextInput?.focus()
        }
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            const prevInput = document.getElementById(`otp-input-${index - 1}`)
            prevInput?.focus()
        }
    }

    // Step 2: Confirm OTP code
    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.trim().length !== 6) {
            setError('Vui lòng nhập đầy đủ mã OTP 6 số.')
            return
        }
        setError('')
        setSuccess('')
        setStep(3)
    }

    // Step 3: Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!newPassword || !confirmPassword) {
            setError('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới và xác nhận mật khẩu không khớp.')
            return
        }

        setIsLoading(true)
        try {
            await axiosInstance.post('/api/auth/forgot-password/reset', {
                email,
                otpCode: otp,
                newPassword
            })
            setSuccess('Đặt lại mật khẩu thành công! Bạn sẽ được chuyển hướng về trang đăng nhập.')
            setTimeout(() => {
                navigate('/login')
            }, 3000)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Khôi phục mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: '#f5ede8' }}
        >
            <div
                className="w-full max-w-5xl flex rounded-3xl overflow-hidden shadow-2xl bg-white"
                style={{ border: '1px solid #ecddd5', minHeight: '600px' }}
            >
                {/* ── Left Column: Hero ── */}
                <div
                    className="hidden lg:block lg:w-[48%] relative bg-cover bg-center p-12 flex flex-col justify-end"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=700')`,
                    }}
                >
                    <div
                        className="p-6 rounded-2xl backdrop-blur-md"
                        style={{ backgroundColor: 'rgba(230, 227, 224, 0.85)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        <div className="flex items-center gap-2 mb-2 text-[#a43e24]">
                            <PawPrint size={20} className="fill-[#a43e24]" />
                            <span className="font-bold text-sm tracking-wide">PetCare Hub</span>
                        </div>
                        <p className="text-xs text-[#303330] font-semibold leading-relaxed">
                            Không gian bình yên, nơi thú cưng được yêu thương như chính thành viên trong gia đình.
                        </p>
                    </div>
                </div>

                {/* ── Right Column: Form Wizard ── */}
                <div className="w-full lg:flex-1 flex items-center justify-center p-10 bg-white">
                    <div className="w-full max-w-md">
                        
                        {/* Error Alert */}
                        {error && (
                            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-left">
                                {error}
                            </div>
                        )}

                        {/* Success Alert */}
                        {success && (
                            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 text-left">
                                <CheckCircle size={14} className="shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Step 1: Quên mật khẩu? */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-3xl font-black text-[#303330] mb-2 text-left">Quên mật khẩu?</h2>
                                <p className="text-xs text-[#8a7e75] mb-8 leading-relaxed text-left">
                                    Nhập email của bạn để nhận mã xác nhận khôi phục mật khẩu. Chúng tôi sẽ gửi hướng dẫn chi tiết đến hộp thư của bạn.
                                </p>

                                <form onSubmit={handleSendOtp} className="space-y-5 text-left">
                                    <div>
                                        <label className="block text-xs text-[#2b4c3f] font-bold mb-2">Email của bạn</label>
                                        <div className="relative">
                                            <Mail
                                                size={15}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#fa7150]"
                                            />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="email@vi-du.com"
                                                className="w-full pl-11 pr-4 py-3.5 border border-[#e5dbd4] rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-gradient-to-r from-[#a43e24] to-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'} <span>→</span>
                                    </button>
                                </form>

                                <div className="mt-6 text-left">
                                    <Link
                                        to="/login"
                                        className="text-xs font-bold text-[#2b4c3f] hover:underline inline-flex items-center gap-1.5"
                                    >
                                        <span>←</span> Quay lại Đăng nhập
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Xác nhận mã OTP */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-3xl font-black text-[#303330] mb-2 text-left">Xác nhận mã OTP</h2>
                                <p className="text-xs text-[#8a7e75] mb-8 leading-relaxed text-left">
                                    Chúng tôi đã gửi mã xác nhận đến email của bạn. Vui lòng nhập <span className="text-[#fa7150] font-black">6 số</span> vào bên dưới để tiếp tục.
                                </p>

                                <form onSubmit={handleVerifyOtp} className="space-y-6 text-left">
                                    {/* 6 Digit Inputs */}
                                    <div className="flex justify-center gap-2 my-4">
                                        {otpValues.map((val, idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-input-${idx}`}
                                                type="text"
                                                maxLength={1}
                                                value={val}
                                                onChange={e => handleOtpChange(idx, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(idx, e)}
                                                className="w-12 h-12 text-center text-lg font-black bg-[#f0ece9] border-none rounded-full outline-none focus:ring-2 focus:ring-[#fa7150] transition-all"
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={otp.trim().length !== 6}
                                        className="w-full py-4 bg-gradient-to-r from-[#a43e24] to-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-95"
                                    >
                                        Xác nhận mã <span>→</span>
                                    </button>
                                </form>

                                <div className="mt-5 flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="text-xs font-bold text-[#8a7e75] hover:text-[#303330] inline-flex items-center gap-1"
                                    >
                                        <span>←</span> Thay đổi email
                                    </button>
                                    <p className="text-xs font-bold text-[#8a7e75]">
                                        {countdown > 0 ? (
                                            <span>Gửi lại sau {countdown}s</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleSendOtp()}
                                                className="text-[#fa7150] hover:underline uppercase tracking-wider font-black cursor-pointer bg-transparent border-none p-0 inline text-xs"
                                            >
                                                Gửi lại mã
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Đặt lại mật khẩu */}
                        {step === 3 && (
                            <div>
                                <h2 className="text-3xl font-black text-[#303330] mb-2 text-left">Đặt lại mật khẩu</h2>
                                <p className="text-xs text-[#8a7e75] mb-8 leading-relaxed text-left">
                                    Tạo mật khẩu mới mạnh mẽ để bảo vệ tài khoản của bạn
                                </p>

                                <form onSubmit={handleResetPassword} className="space-y-5 text-left">
                                    <div>
                                        <label className="block text-xs text-[#2b4c3f] font-bold mb-2">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                required
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-5 py-3.5 border border-[#e5dbd4] rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] focus:border-transparent transition-all pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword
                                                    ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                                    : <Eye size={15} style={{ color: '#fa7150' }} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-[#2b4c3f] font-bold mb-2">Xác nhận mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                required
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-5 py-3.5 border border-[#e5dbd4] rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] focus:border-transparent transition-all pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword
                                                    ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                                    : <Eye size={15} style={{ color: '#fa7150' }} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-gradient-to-r from-[#a43e24] to-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'} <span>→</span>
                                    </button>
                                </form>

                                <div className="mt-6 text-left">
                                    <Link
                                        to="/login"
                                        className="text-xs font-bold text-[#2b4c3f] hover:underline inline-flex items-center gap-1.5"
                                    >
                                        <span>←</span> Quay lại Đăng nhập
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* HỖ TRỢ 24/7 Footer */}
                        <div className="flex items-center gap-3 mt-8">
                            <div className="flex-1 h-px bg-[#e5dbd4]" />
                            <span className="text-[9px] text-[#a09080] tracking-widest font-black uppercase">HỖ TRỢ 24/7</span>
                            <div className="flex-1 h-px bg-[#e5dbd4]" />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
