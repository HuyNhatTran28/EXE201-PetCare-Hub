import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock, PawPrint, User } from 'lucide-react'
import { useRegister } from '@/features/auth/hooks/useRegister'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/store/authStore'
import type { RegisterRequest } from '@/features/auth/types'
import type { AxiosError } from 'axios'
import corgiImg from '@/assets/corgi.png'

interface FormData extends Omit<RegisterRequest, 'role'> {
    confirmPassword?: string
}

export const RegisterPage = () => {
    const navigate = useNavigate()
    const setAuth = useAuthStore((s) => s.setAuth)

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [selectedRole, setSelectedRole] = useState<'OWNER' | 'PARTNER'>('OWNER')
    const { mutate: register, isPending, isError, error } = useRegister()

    // States for OTP Verification
    const [showOtpStep, setShowOtpStep] = useState(false)
    const [registeredEmail, setRegisteredEmail] = useState('')
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
    const [countdown, setCountdown] = useState(0)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [verificationError, setVerificationError] = useState<string | null>(null)
    const [resendMessage, setResendMessage] = useState<string | null>(null)
    const [oauthError, setOauthError] = useState('')
    const [showRegisteredModal, setShowRegisteredModal] = useState(false)
    const [isGoogleFlow, setIsGoogleFlow] = useState(false)
    const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const emailParam = params.get('email')
        const otpParam = params.get('otp')
        const errParam = params.get('error')

        if (errParam) {
            if (errParam.includes('đã được sử dụng') || errParam.includes('đã tồn tại') || errParam.includes('đã đăng ký')) {
                setShowRegisteredModal(true)
            } else {
                setOauthError(errParam)
            }
        }

        if (emailParam && otpParam === 'true') {
            setRegisteredEmail(emailParam)
            setShowOtpStep(true)
            setCountdown(60)
            setOtpValues(['', '', '', '', '', ''])
            setIsGoogleFlow(true)
            setTimeout(() => {
                inputRefs.current[0]?.focus()
            }, 200)
        }
    }, [])

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const {
        register: field,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>()

    // Countdown Timer Effect
    useEffect(() => {
        if (countdown <= 0) return
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [countdown])

    const onSubmit = (data: FormData) => {
        const { confirmPassword, ...registerData } = data
        setVerificationError(null)
        setResendMessage(null)
        register(
            {
                ...registerData,
                fullName: registerData.fullName?.trim(),
                email: registerData.email?.trim(),
                role: selectedRole
            },
            {
                onSuccess: () => {
                    setRegisteredEmail(registerData.email?.trim())
                    setShowOtpStep(true)
                    setCountdown(60)
                    setOtpValues(['', '', '', '', '', ''])
                    setTimeout(() => {
                        inputRefs.current[0]?.focus()
                    }, 100)
                }
            }
        )
    }

    const handleOtpChange = (value: string, index: number) => {
        const val = value.replace(/[^0-9]/g, '')
        const newOtp = [...otpValues]
        newOtp[index] = val
        setOtpValues(newOtp)

        // Move to next field if we typed a character
        if (val && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            const newOtp = [...otpValues]
            if (!otpValues[index] && index > 0) {
                newOtp[index - 1] = ''
                setOtpValues(newOtp)
                inputRefs.current[index - 1]?.focus()
            } else {
                newOtp[index] = ''
                setOtpValues(newOtp)
            }
        }
    }

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('')
            setOtpValues(newOtp)
            inputRefs.current[5]?.focus()
        }
    }

    const submitVerifyOtp = async (selectedRoleStr?: string) => {
        const otpCode = otpValues.join('')
        setIsVerifying(true)
        setVerificationError(null)
        try {
            const res = await authService.verifyRegisterOtp({ 
                email: registeredEmail, 
                otpCode,
                role: selectedRoleStr
            })
            setAuth(res.accessToken, res.refreshToken, res.user)
            navigate('/')
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Xác thực thất bại. Vui lòng thử lại.'
            setVerificationError(message)
            setShowRoleSelectionModal(false)
        } finally {
            setIsVerifying(false)
        }
    }

    const handleVerifyOtp = async () => {
        const otpCode = otpValues.join('')
        if (otpCode.length !== 6) return

        if (isGoogleFlow) {
            setShowRoleSelectionModal(true)
        } else {
            await submitVerifyOtp()
        }
    }

    const handleResendOtp = async () => {
        setIsResending(true)
        setVerificationError(null)
        setResendMessage(null)
        try {
            const res = await authService.resendRegisterOtp(registeredEmail)
            setResendMessage(res.message || 'Mã OTP mới đã được gửi thành công.')
            setCountdown(60)
            setOtpValues(['', '', '', '', '', ''])
            setTimeout(() => {
                inputRefs.current[0]?.focus()
            }, 100)
        } catch (err: any) {
            const message = err?.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại.'
            setVerificationError(message)
        } finally {
            setIsResending(false)
        }
    }

    const apiError = oauthError || (error as AxiosError<{ message: string }>)?.response?.data?.message

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

                {/* ── Bên trái — Hero (giống LoginPage) ──────── */}
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
                    {showOtpStep ? (
                        <div className="w-full max-w-sm animate-fadeIn">
                            {/* Tiêu đề & Mô tả */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-2" style={{ color: '#303330' }}>
                                    Xác thực tài khoản
                                </h2>
                                <p className="text-sm leading-relaxed" style={{ color: '#8a7060' }}>
                                    Mã OTP 6 chữ số đã được gửi về email <strong className="break-all" style={{ color: '#fa7150' }}>{registeredEmail}</strong>.
                                    Vui lòng nhập mã để kích hoạt tài khoản.
                                </p>
                            </div>

                            {/* Lỗi xác thực */}
                            {verificationError && (
                                <div
                                    className="mb-4 p-3 rounded-xl text-sm"
                                    style={{
                                        backgroundColor: '#fff7f4',
                                        color: '#a43e24',
                                        border: '1px solid #ffac98',
                                    }}
                                >
                                    {verificationError}
                                </div>
                            )}

                            {/* Thông báo gửi lại OTP thành công */}
                            {resendMessage && (
                                <div
                                    className="mb-4 p-3 rounded-xl text-sm"
                                    style={{
                                        backgroundColor: '#f6fff6',
                                        color: '#248a24',
                                        border: '1px solid #98ff98',
                                    }}
                                >
                                    {resendMessage}
                                </div>
                            )}

                            {/* Giao diện nhập OTP dạng 6 ô vuông */}
                            <div className="flex justify-between gap-2 my-6">
                                {otpValues.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => { inputRefs.current[idx] = el; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                                        className="w-12 h-14 text-center text-xl font-bold rounded-xl border outline-none transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        style={{
                                            backgroundColor: '#fdfaf8',
                                            borderColor: '#e5dbd4',
                                            color: '#303330',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Các nút điều khiển */}
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={isVerifying || otpValues.some((v) => !v)}
                                    className="w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
                                    style={{
                                        backgroundColor: (isVerifying || otpValues.some((v) => !v)) ? '#ffac98' : '#fa7150',
                                        cursor: (isVerifying || otpValues.some((v) => !v)) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isVerifying ? 'Đang xác thực...' : 'Xác thực và Đăng ký'}
                                </button>

                                <div className="flex items-center justify-between text-sm">
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={countdown > 0 || isResending}
                                        className="font-semibold cursor-pointer disabled:cursor-not-allowed"
                                        style={{
                                            color: (countdown > 0 || isResending) ? '#a09080' : '#a43e24',
                                        }}
                                    >
                                        {isResending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                                    </button>
                                    {countdown > 0 && (
                                        <span className="text-xs" style={{ color: '#8a7060' }}>
                                            Gửi lại sau <strong>{countdown}</strong> giây
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowOtpStep(false)}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer"
                                    style={{
                                        backgroundColor: '#ffffff',
                                        borderColor: '#e5dbd4',
                                        color: '#7a5040',
                                    }}
                                >
                                    Quay lại đăng ký
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-sm">

                            {/* Welcome */}
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1" style={{ color: '#303330' }}>
                                    Tạo tài khoản mới
                                </h2>
                                <p className="text-sm" style={{ color: '#8a7060' }}>
                                    Tham gia cộng đồng yêu thú cưng ngay hôm nay.
                                </p>
                            </div>

                            {/* Tab Đăng nhập / Đăng ký */}
                            <div
                                className="flex gap-1 p-1 rounded-xl mb-6"
                                style={{ backgroundColor: '#f0e8e2' }}
                            >
                                <Link
                                    to="/login"
                                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center"
                                    style={{ color: '#a43e24' }}
                                >
                                    Đăng nhập
                                </Link>
                                <button
                                    className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                    style={{
                                        backgroundColor: '#ffffff',
                                        color: '#303330',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    Đăng ký
                                </button>
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
                                    {apiError ?? 'Đăng ký thất bại. Vui lòng thử lại.'}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                                {/* Họ và tên */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#303330' }}>
                                        Họ và tên
                                    </label>
                                    <div className="relative">
                                        <User
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2"
                                            style={{ color: '#fa7150' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Nguyễn Văn A"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
                                            style={{
                                                backgroundColor: '#fdfaf8',
                                                borderColor: errors.fullName ? '#fa7150' : '#e5dbd4',
                                                color: '#303330',
                                            }}
                                            {...field('fullName', {
                                                required: 'Họ và tên không được để trống',
                                                minLength: {
                                                    value: 2,
                                                    message: 'Họ và tên phải có ít nhất 2 ký tự',
                                                },
                                            })}
                                        />
                                    </div>
                                    {errors.fullName && (
                                        <p className="mt-1 text-xs" style={{ color: '#fa7150' }}>
                                            {errors.fullName.message}
                                        </p>
                                    )}
                                </div>

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
                                            {...field('email', {
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

                                {/* Mật khẩu */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#303330' }}>
                                        Mật khẩu
                                    </label>
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
                                            {...field('password', {
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

                                {/* Xác nhận mật khẩu */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#303330' }}>
                                        Xác nhận mật khẩu
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2"
                                            style={{ color: '#fa7150' }}
                                        />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 rounded-xl border text-sm outline-none"
                                            style={{
                                                backgroundColor: '#fdfaf8',
                                                borderColor: errors.confirmPassword ? '#fa7150' : '#e5dbd4',
                                                color: '#303330',
                                            }}
                                            {...field('confirmPassword', {
                                                required: 'Vui lòng xác nhận mật khẩu',
                                                validate: (value) =>
                                                    value === watch('password') || 'Mật khẩu xác nhận không trùng khớp',
                                            })}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword
                                                ? <EyeOff size={15} style={{ color: '#fa7150' }} />
                                                : <Eye size={15} style={{ color: '#fa7150' }} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="mt-1 text-xs" style={{ color: '#fa7150' }}>
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>

                                {/* Tab Vai trò: Khách Hàng / Doanh Nghiệp */}
                                <div className="pt-1">
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#303330' }}>
                                        Loại tài khoản
                                    </label>
                                    <div
                                        className="flex gap-1 p-1 rounded-xl"
                                        style={{ backgroundColor: '#f0e8e2' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('OWNER')}
                                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all"
                                            style={{
                                                backgroundColor: selectedRole === 'OWNER' ? '#ffffff' : 'transparent',
                                                color: selectedRole === 'OWNER' ? '#fa7150' : '#8a7060',
                                                boxShadow: selectedRole === 'OWNER' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            }}
                                        >
                                            Khách Hàng
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('PARTNER')}
                                            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer transition-all"
                                            style={{
                                                backgroundColor: selectedRole === 'PARTNER' ? '#ffffff' : 'transparent',
                                                color: selectedRole === 'PARTNER' ? '#fa7150' : '#8a7060',
                                                boxShadow: selectedRole === 'PARTNER' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            }}
                                        >
                                            Doanh Nghiệp
                                        </button>
                                    </div>
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
                                    {isPending ? 'Đang đăng ký...' : 'Đăng ký'}
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
                                    window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/auth/oauth2/register?role=${selectedRole}`
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
                                Tiếp tục nhanh với Google
                            </button>

                            {/* Đã có tài khoản */}
                            <p className="text-center text-sm mt-5" style={{ color: '#a09080' }}>
                                Đã có tài khoản?{' '}
                                <Link to="/login" className="font-semibold underline" style={{ color: '#a43e24' }}>
                                    Đăng nhập
                                </Link>
                            </p>

                        </div>
                    )}
                </div>

            {/* ── Already Registered User Modal ── */}
            {showRegisteredModal && (
                <div 
                    className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setShowRegisteredModal(false)}
                >
                    <div 
                        className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left relative cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-black mb-3" style={{ color: '#303330' }}>
                                    Email đã được đăng ký
                                </h3>
                                <p className="text-xs font-bold leading-relaxed mb-2" style={{ color: '#8a7e75' }}>
                                    Email này đã được sử dụng để đăng ký tài khoản trên hệ thống. Vui lòng đăng nhập để tiếp tục.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Link
                                    to="/login"
                                    onClick={() => setShowRegisteredModal(false)}
                                    className="flex-1 py-4 text-center bg-[#fa7150] hover:bg-[#a43e24] text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                                >
                                    Đăng nhập ngay
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setShowRegisteredModal(false)}
                                    className="flex-1 py-4 border border-[#e5dbd4] rounded-full text-[#303330] font-bold text-xs uppercase tracking-wider transition-all hover:bg-gray-50 cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Role Selection Modal for Google Register ── */}
            {showRoleSelectionModal && (
                <div 
                    className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setShowRoleSelectionModal(false)}
                >
                    <div 
                        className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left relative cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-black mb-3" style={{ color: '#303330' }}>
                                    Chọn loại tài khoản
                                </h3>
                                <p className="text-xs font-bold leading-relaxed mb-2" style={{ color: '#8a7e75' }}>
                                    Để hoàn tất đăng ký, vui lòng chọn vai trò bạn muốn tham gia trên hệ thống PetCare Hub:
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => submitVerifyOtp('OWNER')}
                                    className="w-full py-4 bg-white hover:bg-[#fa7150] border border-[#e5dbd4] hover:border-[#fa7150] text-[#303330] hover:text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                >
                                    Khách Hàng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submitVerifyOtp('PARTNER')}
                                    className="w-full py-4 bg-white hover:bg-[#fa7150] border border-[#e5dbd4] hover:border-[#fa7150] text-[#303330] hover:text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                                >
                                    Doanh Nghiệp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
)
}
