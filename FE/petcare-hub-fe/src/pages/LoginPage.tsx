import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Mail, Lock, PawPrint } from 'lucide-react'
import { useLogin } from '@/features/auth/hooks/useLogin'
import type { LoginRequest } from '@/features/auth/types'

export const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false)
    const { mutate: login, isPending, isError } = useLogin()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginRequest>()

    const onSubmit = (data: LoginRequest) => login(data)

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
                                src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=700"
                                alt="Chó vui vẻ"
                                className="w-full h-60 object-cover rounded-2xl shadow-lg"
                            />
                            {/* Badge đè lên ảnh */}
                            <div
                                className="absolute -bottom-5 right-[-0.75rem] inline-flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
                                style={{ backgroundColor: '#ffffff', border: '1px solid #f0e4de' }}
                            >
                                <div className="p-2 rounded-xl" style={{ backgroundColor: '#fff0e6' }}>
                                    <PawPrint size={18} style={{ color: '#fa7150' }} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: '#a43e24' }}>
                                        Trải nghiệm
                                    </p>
                                    <p className="text-xs font-semibold leading-tight" style={{ color: '#303330' }}>
                                        Hơn 500+ thú cưng<br />đã lưu trú vui vẻ.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-xs z-10 mt-14" style={{ color: '#b07060' }}>
                        © 2024 PetCare Hub. Đã đăng ký bản quyền.
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
                        {isError && (
                            <div
                                className="mb-4 p-3 rounded-xl text-sm"
                                style={{
                                    backgroundColor: '#fff7f4',
                                    color: '#a43e24',
                                    border: '1px solid #ffac98',
                                }}
                            >
                                Email hoặc mật khẩu không đúng. Vui lòng thử lại.
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
                                    <a href="#" className="text-sm" style={{ color: '#fa7150' }}>
                                        Quên mật khẩu?
                                    </a>
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
        </div>
    )
}
