import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock, PawPrint, X, Key, CheckCircle } from 'lucide-react'
import { useLogin } from '@/features/auth/hooks/useLogin'
import type { LoginRequest } from '@/features/auth/types'
import axiosInstance from '@/lib/axios'
import corgiImg from '@/assets/corgi.png'

export const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false)
    const { mutate: login, isPending, isError, error } = useLogin()
    const [oauthError, setOauthError] = useState('')
    const [showUnregisteredModal, setShowUnregisteredModal] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const errParam = params.get('error')
        if (errParam) {
            if (errParam.includes('chưa được đăng ký') || errParam.includes('chưa đăng ký')) {
                setShowUnregisteredModal(true)
            } else {
                setOauthError(errParam)
            }
        }
    }, [])

    // States for Forgot Password Modal
    const [showForgotModal, setShowForgotModal] = useState(false)
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
    const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [forgotOtp, setForgotOtp] = useState('')
    const [forgotPassword, setForgotPassword] = useState('')
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
    const [forgotCountdown, setForgotCountdown] = useState(0)
    const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otpVerified, setOtpVerified] = useState(false)
    const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''))
    const [forgotError, setForgotError] = useState('')
    const [forgotSuccess, setForgotSuccess] = useState('')

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return
        const newOtpValues = [...otpValues]
        newOtpValues[index] = value.slice(-1)
        setOtpValues(newOtpValues)
        setForgotOtp(newOtpValues.join(''))

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

    // Countdown effect
    useEffect(() => {
        if (forgotCountdown <= 0) return
        const timer = setInterval(() => {
            setForgotCountdown(prev => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [forgotCountdown])

    const handleSendForgotOtp = async () => {
        setForgotError('')
        setForgotSuccess('')
        if (!forgotEmail) {
            setForgotError('Vui lòng nhập hoặc điền chính xác Email của bạn.')
            return
        }
        if (!forgotPassword || !forgotConfirmPassword) {
            setForgotError('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu mới trước.')
            return
        }
        if (forgotPassword !== forgotConfirmPassword) {
            setForgotError('Mật khẩu mới và xác nhận mật khẩu không khớp.')
            return
        }
        setIsSendingForgotOtp(true)
        try {
            await axiosInstance.post(`/api/auth/forgot-password/otp?email=${encodeURIComponent(forgotEmail)}`)
            setForgotSuccess('Mã OTP khôi phục mật khẩu đã được gửi đến Email của bạn.')
            setForgotCountdown(90) // 1m30s = 90s cooldown timer
            setOtpSent(true)
        } catch (err: any) {
            setForgotError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại Email.')
        } finally {
            setIsSendingForgotOtp(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setForgotError('')
        setForgotSuccess('')

        if (!forgotEmail || !forgotOtp || !forgotPassword || !forgotConfirmPassword) {
            setForgotError('Vui lòng nhập đầy đủ các trường.')
            return
        }

        if (forgotPassword !== forgotConfirmPassword) {
            setForgotError('Mật khẩu mới và xác nhận mật khẩu không khớp.')
            return
        }

        setIsResetting(true)
        try {
            await axiosInstance.post('/api/auth/forgot-password/reset', {
                email: forgotEmail,
                otpCode: forgotOtp,
                newPassword: forgotPassword
            })
            setForgotSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.')
            setTimeout(() => {
                setShowForgotModal(false)
                setForgotEmail('')
                setForgotOtp('')
                setForgotPassword('')
                setForgotConfirmPassword('')
                setForgotSuccess('')
                setOtpSent(false)
            }, 3000)
        } catch (err: any) {
            setForgotError(err.response?.data?.message || 'Khôi phục mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.')
        } finally {
            setIsResetting(false)
        }
    }

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<LoginRequest>()

    const onSubmit = (data: LoginRequest) => {
        login({
            ...data,
            email: data.email?.trim()
        })
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: '#f5ede8' }}
        >
            {/* ── Card bọc cả hai cột ────────────────────────── */}
            <div
                className="w-full max-w-6xl flex rounded-3xl overflow-hidden shadow-2xl"
                style={{ border: '1px solid #ecddd5', minHeight: '620px' }}
            >

                {/* ── Bên trái — Hero ─────────────────────────── */}
                <div
                    className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative overflow-hidden"
                    style={{ backgroundColor: '#fff7f4' }}
                >
                    {/* Blob trang trí */}
                    <div
                        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, rgba(250,113,80,0.22) 0%, transparent 70%)',
                            marginRight: '-6rem',
                            marginTop: '-6rem',
                        }}
                    />

                    {/* Logo */}
                    <div className="flex items-center gap-2 z-10">
                        <PawPrint size={26} style={{ color: '#fa7150' }} />
                        <span className="text-lg font-bold" style={{ color: '#303330' }}>
                            PetCare Hub
                        </span>
                    </div>

                    {/* Hero text + ảnh */}
                    <div className="z-10 flex flex-col flex-grow justify-center mt-8">
                        <h1
                            className="text-4xl font-extrabold mb-4 leading-tight"
                            style={{ color: '#303330' }}
                        >
                            Ngôi nhà thứ hai<br />
                            ấm áp cho{' '}
                            <span style={{ color: '#fa7150' }}>thú cưng</span>
                        </h1>
                        <p className="text-sm mb-10 max-w-xs leading-relaxed" style={{ color: '#7a5040' }}>
                            Nơi tình yêu và sự chăm sóc chuyên nghiệp giao thoa,
                            mang lại sự an tâm tuyệt đối cho bạn.
                        </p>

                        <div className="relative w-full max-w-sm">
                            <img
                                src={corgiImg}
                                alt="Chó Corgi vui vẻ"
                                className="w-full h-60 object-cover rounded-2xl shadow-lg"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-xs z-10 mt-14" style={{ color: '#b07060' }}>
                        © 2026 PetCare Hub. Đã đăng ký bản quyền.
                    </p>
                </div>

                {/* ── Divider dọc ─────────────────────────────── */}
                <div className="hidden lg:block w-px flex-shrink-0" style={{ backgroundColor: '#ecddd5' }} />

                {/* ── Bên phải — Form ─────────────────────────── */}
                <div className="w-full lg:flex-1 flex items-center justify-center p-12 bg-white">
                    <div className="w-full max-w-sm">

                        {/* Welcome */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-1" style={{ color: '#303330' }}>
                                Chào mừng trở lại!
                            </h2>
                            <p className="text-sm" style={{ color: '#8a7060' }}>
                                Vui lòng nhập thông tin để truy cập tài khoản.
                            </p>
                        </div>

                        {/* Tab Đăng nhập / Đăng ký */}
                        <div
                            className="flex gap-1 p-1 rounded-xl mb-6"
                            style={{ backgroundColor: '#f0e8e2' }}
                        >
                            <button
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                style={{
                                    backgroundColor: '#ffffff',
                                    color: '#303330',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                }}
                            >
                                Đăng nhập
                            </button>
                            <Link
                                to="/register"
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center"
                                style={{ color: '#a43e24' }}
                            >
                                Đăng ký
                            </Link>
                        </div>

                        {/* Lỗi API */}
                        {(isError || oauthError) && (
                            <div
                                className="mb-4 p-3 rounded-xl text-sm"
                                style={{
                                    backgroundColor: '#fff7f4',
                                    color: '#a43e24',
                                    border: '1px solid #ffac98',
                                }}
                            >
                                {oauthError || (error as any)?.response?.data?.message || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: '#303330' }}>
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2"
                                        style={{ color: '#fa7150' }}
                                    />
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
                                        style={{
                                            backgroundColor: '#fdfaf8',
                                            borderColor: errors.email ? '#fa7150' : '#e5dbd4',
                                            color: '#303330',
                                        }}
                                        {...register('email', {
                                            required: 'Email không được để trống',
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: 'Email không đúng định dạng',
                                            },
                                        })}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-xs" style={{ color: '#fa7150' }}>
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex justify-between mb-1.5">
                                    <label className="text-sm font-medium" style={{ color: '#303330' }}>
                                        Mật khẩu
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        state={{ email: getValues('email') }}
                                        className="text-sm font-semibold hover:underline cursor-pointer"
                                        style={{ color: '#fa7150' }}
                                    >
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2"
                                        style={{ color: '#fa7150' }}
                                    />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none"
                                        style={{
                                            backgroundColor: '#fdfaf8',
                                            borderColor: errors.password ? '#fa7150' : '#e5dbd4',
                                            color: '#303330',
                                        }}
                                        {...register('password', {
                                            required: 'Mật khẩu không được để trống',
                                            minLength: {
                                                value: 8,
                                                message: 'Mật khẩu phải có ít nhất 8 ký tự',
                                            },
                                        })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword
                                            ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                            : <Eye size={15} style={{ color: '#fa7150' }} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs" style={{ color: '#fa7150' }}>
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2"
                                style={{
                                    backgroundColor: isPending ? '#ffac98' : '#fa7150',
                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>

                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px" style={{ backgroundColor: '#e5dbd4' }} />
                            <span className="text-xs" style={{ color: '#a09080' }}>Hoặc</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: '#e5dbd4' }} />
                        </div>

                        {/* Google */}
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/auth/oauth2/login`
                            }}
                            className="w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            style={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e5dbd4',
                                color: '#303330',
                            }}
                        >
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                alt="Google"
                                className="w-5 h-5"
                            />
                            Tiếp tục với Google
                        </button>

                        {/* Terms */}
                        <p className="text-center text-xs mt-5" style={{ color: '#a09080' }}>
                            Bằng cách đăng nhập, bạn đồng ý với{' '}
                            <a href="#" className="underline" style={{ color: '#a43e24' }}>Điều khoản</a>
                            {' '}&{' '}
                            <a href="#" className="underline" style={{ color: '#a43e24' }}>Chính sách</a> của chúng tôi.
                        </p>

                    </div>
                </div>

            </div>

            {/* ── Forgot Password Modal ── */}
            {/* ── Forgot Password Modal ── */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 md:pl-28 md:pr-8 md:py-8 max-w-md md:max-w-[500px] w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left relative">
                        {/* Peeking Dog Image on the Left (hidden on mobile, absolute on desktop) */}
                        <div className="absolute left-[-110px] top-1/2 -translate-y-1/2 w-44 h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none z-10 hidden md:block">
                            <img
                                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"
                                alt="Dog peek"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Back / Close button top left */}
                        <button
                            type="button"
                            onClick={() => {
                                if (otpSent && otpVerified) {
                                    setOtpVerified(false);
                                } else if (otpSent) {
                                    setOtpSent(false);
                                    setForgotOtp('');
                                    setOtpValues(Array(6).fill(''));
                                } else {
                                    setShowForgotModal(false);
                                }
                                setForgotError('');
                                setForgotSuccess('');
                            }}
                            className="absolute top-6 left-6 text-[10px] tracking-wider uppercase font-black text-[#8a7e75] hover:text-[#303330] flex items-center gap-1 cursor-pointer transition-colors md:left-28"
                        >
                            <span>←</span> QUAY LẠI
                        </button>

                        {/* Close button top right */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowForgotModal(false);
                                setForgotError('');
                                setForgotSuccess('');
                                setOtpSent(false);
                                setOtpVerified(false);
                                setForgotOtp('');
                                setOtpValues(Array(6).fill(''));
                                setForgotPassword('');
                                setForgotConfirmPassword('');
                            }}
                            className="absolute top-5 right-5 p-1.5 hover:bg-[#faf9f6] text-[#8a7e75] hover:text-[#303330] rounded-full transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        {/* Step 1: Quên mật khẩu? (Enter Email) */}
                        {!otpSent && (
                            <div className="pt-6">
                                <h3 className="text-2xl font-black text-[#303330] mb-2 text-left">Quên mật khẩu?</h3>
                                <p className="text-xs text-[#8a7e75] mb-6 leading-relaxed text-left">
                                    Nhập email của bạn để nhận mã xác nhận khôi phục mật khẩu. Chúng tôi sẽ gửi hướng dẫn chi tiết đến hộp thư của bạn.
                                </p>

                                {forgotError && (
                                    <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-left">
                                        {forgotError}
                                    </div>
                                )}

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendForgotOtp();
                                    }}
                                    className="space-y-4 text-left"
                                >
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
                                                value={forgotEmail}
                                                onChange={e => setForgotEmail(e.target.value)}
                                                placeholder="email@vi-du.com"
                                                className="w-full pl-11 pr-4 py-3.5 bg-[#f0ece9] border-none rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSendingForgotOtp}
                                        className="w-full py-4 bg-gradient-to-r from-[#a43e24] to-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-95"
                                    >
                                        {isSendingForgotOtp ? 'Đang gửi...' : 'Gửi mã xác nhận'} <span>→</span>
                                    </button>
                                </form>

                                <div className="mt-4 text-left">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        className="text-xs font-bold text-[#2b4c3f] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>←</span> Quay lại Đăng nhập
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mt-6">
                                    <div className="flex-1 h-px bg-[#e5dbd4]" />
                                    <span className="text-[9px] text-[#a09080] tracking-widest font-black uppercase">HỖ TRỢ 24/7</span>
                                    <div className="flex-1 h-px bg-[#e5dbd4]" />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Xác nhận mã OTP */}
                        {otpSent && !otpVerified && (
                            <div className="pt-6">
                                <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-[#e8f5e9] rounded-full">
                                    <PawPrint size={32} className="text-[#2e7d32]" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#b71c1c] rounded-full border-2 border-white flex items-center justify-center text-white">
                                        <Lock size={12} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-[#303330] mb-2 text-left">Xác nhận mã OTP</h3>
                                <p className="text-xs text-[#8a7e75] mb-6 leading-relaxed text-left">
                                    Chúng tôi đã gửi mã xác nhận đến email của bạn. Vui lòng nhập <span className="text-[#fa7150] font-black">6 số</span> vào bên dưới để tiếp tục.
                                </p>

                                {forgotError && (
                                    <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-left">
                                        {forgotError}
                                    </div>
                                )}

                                {forgotSuccess && (
                                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 text-left">
                                        <CheckCircle size={14} className="shrink-0" />
                                        <span>{forgotSuccess}</span>
                                    </div>
                                )}

                                <div className="space-y-6">
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
                                        type="button"
                                        disabled={forgotOtp.trim().length !== 6}
                                        onClick={() => setOtpVerified(true)}
                                        className="w-full py-4 bg-gradient-to-r from-[#a43e24] to-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-95"
                                    >
                                        Xác nhận mã <span>→</span>
                                    </button>

                                    <p className="text-xs font-bold text-[#8a7e75] text-center">
                                        Không nhận được mã?{' '}
                                        {forgotCountdown > 0 ? (
                                            <span className="text-[#fa7150]">Gửi lại sau {forgotCountdown}s</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendForgotOtp}
                                                className="text-[#fa7150] hover:underline uppercase tracking-wider font-black cursor-pointer bg-transparent border-none p-0 inline"
                                            >
                                                Gửi lại
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Đặt lại mật khẩu (Enter Passwords) */}
                        {otpSent && otpVerified && (
                            <div>
                                <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-[#fdf5f2] rounded-full">
                                    <div className="w-10 h-10 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-[#fa7150]">
                                        <Key size={20} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-[#303330] mb-2">Đặt lại mật khẩu</h3>
                                <p className="text-xs text-[#8a7e75] mb-6 leading-relaxed px-4">
                                    Tạo mật khẩu mới mạnh mẽ để bảo vệ tài khoản của bạn
                                </p>

                                {forgotError && (
                                    <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-left">
                                        {forgotError}
                                    </div>
                                )}

                                {forgotSuccess && (
                                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 text-left">
                                        <CheckCircle size={14} className="shrink-0" />
                                        <span>{forgotSuccess}</span>
                                    </div>
                                )}

                                <form onSubmit={handleResetPassword} className="space-y-4 text-left">
                                    <div>
                                        <label className="block text-[10px] text-[#8a7e75] uppercase font-bold tracking-wider mb-2">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showForgotNewPassword ? 'text' : 'password'}
                                                required
                                                value={forgotPassword}
                                                onChange={e => setForgotPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-5 py-3.5 bg-[#f0ece9] border-none rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] transition-all pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                                onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                                            >
                                                {showForgotNewPassword
                                                    ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                                    : <Eye size={15} style={{ color: '#fa7150' }} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-[#8a7e75] uppercase font-bold tracking-wider mb-2">Xác nhận mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showForgotConfirmPassword ? 'text' : 'password'}
                                                required
                                                value={forgotConfirmPassword}
                                                onChange={e => setForgotConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-5 py-3.5 bg-[#f0ece9] border-none rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-[#fa7150] transition-all pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                                                onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                                            >
                                                {showForgotConfirmPassword
                                                    ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                                    : <Eye size={15} style={{ color: '#fa7150' }} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isResetting}
                                        className="w-full py-4 bg-[#a43e24] hover:bg-[#fa7150] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isResetting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'} <span>→</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Unregistered User Modal ── */}
            {showUnregisteredModal && (
                <div 
                    className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setShowUnregisteredModal(false)}
                >
                    <div 
                        className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left relative cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-black mb-3" style={{ color: '#303330' }}>
                                    Tài khoản chưa được đăng ký
                                </h3>
                                <p className="text-xs font-bold leading-relaxed mb-2" style={{ color: '#8a7e75' }}>
                                    Tài khoản của bạn chưa được đăng ký trên hệ thống. Vui lòng đăng ký tài khoản mới để tiếp tục.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Link
                                    to="/register"
                                    onClick={() => setShowUnregisteredModal(false)}
                                    className="flex-1 py-4 text-center bg-[#fa7150] hover:bg-[#a43e24] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                                >
                                    Đăng ký ngay
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setShowUnregisteredModal(false)}
                                    className="flex-1 py-4 border border-[#e5dbd4] rounded-full text-[#303330] font-bold text-xs uppercase tracking-wider transition-all hover:bg-gray-50 cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
