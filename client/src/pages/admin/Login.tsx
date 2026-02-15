import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    // Daftar Akun Admin sesuai Wilayah
    const adminAccounts = [
        { email: 'seturan@keenan.com', name: 'Admin Seturan', scope: 'Seturan' },
        { email: 'perumnas@keenan.com', name: 'Admin Perumnas', scope: 'Perumnas' },
        { email: 'jakal@keenan.com', name: 'Admin Jakal', scope: 'Jakal' },
        { email: 'luxe@keenan.com', name: 'Admin Luxe Seturan', scope: 'Luxe Seturan' }
    ];

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        setTimeout(() => {
            const user = adminAccounts.find(u => u.email === formData.email && formData.password === 'admin123');
            if (user) {
                localStorage.setItem('keenan_admin_token', 'AUTHORIZED');
                localStorage.setItem('keenan_admin_name', user.name);
                localStorage.setItem('keenan_admin_scope', user.scope);
                navigate('/admin/dashboard');
            } else {
                alert("Email atau Password salah!");
                setLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-white flex font-sans">
            {/* KIRI: Visual Branding */}
            <div className="hidden lg:flex lg:w-3/5 bg-[#1A1A1A] relative items-center justify-center p-12">
                <div className="absolute inset-0 opacity-40">
                    <img
                        src="https://images.unsplash.com/photo-1600585154340-be6191fe75a1?q=80&w=2070"
                        className="w-full h-full object-cover" alt="Luxury Property"
                    />
                </div>
                <div className="relative z-10 text-center">
                    <h1 className="text-[#C5A059] text-7xl font-serif font-bold mb-4 tracking-tighter">KEENAN LIVING</h1>
                    <p className="text-white text-xl font-light tracking-[0.4em] uppercase">Property Management System</p>
                </div>
            </div>

            {/* KANAN: Login Form */}
            <div className="w-full lg:w-2/5 flex items-center justify-center p-8 md:p-16">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-4xl font-serif font-bold text-[#1A1A1A] mb-3">Admin Login</h2>
                        <p className="text-gray-400">Pilih akun sesuai wilayah manajemen Anda.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-2">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-gray-300" size={20} />
                                <input
                                    type="email" required
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]"
                                    placeholder="nama.wilayah@keenan.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-4 text-gray-300" size={20} />
                                <input
                                    type="password" required
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059]"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-[#1A1A1A] text-white py-5 rounded-xl font-bold tracking-widest hover:bg-black transition-all flex justify-center items-center gap-3 shadow-xl"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "ACCESS SYSTEM"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}