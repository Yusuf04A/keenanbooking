import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api'; // <--- GANTI: Pakai API Laravel
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Request Login ke Laravel (POST /api/login)
            const response = await api.post('/login', {
                email: email,
                password: password
            });

            const data = response.data; // { access_token, token_type, user: { ... } }

            // 2. Simpan Token & Data User di LocalStorage
            // Token ini nanti akan otomatis dipakai 'api.ts' untuk request selanjutnya
            localStorage.setItem('keenan_admin_token', data.access_token);
            localStorage.setItem('keenan_admin_name', data.user.full_name);
            localStorage.setItem('keenan_admin_role', data.user.role);
            localStorage.setItem('keenan_admin_scope', data.user.scope);

            // 3. Redirect sesuai Role
            if (data.user.role === 'superadmin') {
                navigate('/admin/super-dashboard'); // Redirect ke Dashboard Dewa
            } else {
                navigate('/admin/dashboard'); // Redirect ke Dashboard Karyawan
            }

        } catch (err: any) {
            console.error("Login Error:", err);
            // Tampilkan pesan error dari backend Laravel (jika ada)
            const errorMessage = err.response?.data?.message || "Login gagal. Periksa email/password atau koneksi server.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans">

            {/* --- BAGIAN KIRI: IMAGE & BRANDING (Hidden di Mobile) --- */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-black">
                <img
                    src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop"
                    alt="Keenan Hotel"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="relative z-10 p-16 flex flex-col justify-end h-full text-white">
                    <h1 className="text-5xl font-serif font-bold mb-4 tracking-tight">Keenan Living.</h1>
                    <p className="text-lg opacity-80 max-w-md leading-relaxed">
                        Experience the art of hospitality. Manage your property bookings and guests with elegance and ease.
                    </p>
                    <div className="mt-8 flex gap-2">
                        <div className="w-12 h-1 bg-keenan-gold rounded-full"></div>
                        <div className="w-4 h-1 bg-gray-600 rounded-full"></div>
                        <div className="w-4 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* --- BAGIAN KANAN: FORM LOGIN --- */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white">
                <div className="w-full max-w-md">

                    <div className="mb-10">
                        <div className="w-12 h-12 bg-keenan-dark text-keenan-gold rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                        <p className="text-gray-500 text-sm">Please enter your credentials to access the dashboard.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">

                        {/* Input Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-900 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-keenan-gold transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-keenan-gold focus:ring-4 focus:ring-keenan-gold/10 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                    placeholder="admin@keenan.com"
                                />
                            </div>
                        </div>

                        {/* Input Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-900 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-keenan-gold transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-keenan-gold focus:ring-4 focus:ring-keenan-gold/10 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-black hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 group"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Login to Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </div>

                    </form>

                    <p className="mt-8 text-center text-xs text-gray-400">
                        &copy; 2026 Keenan Living Group. All rights reserved.<br />
                        <span className="opacity-50">Authorized Personnel Only.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}