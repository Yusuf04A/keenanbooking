import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // Pastikan path ini benar
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Cek ke Database Supabase
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .eq('username', username)
                .eq('password', password) // Note: Di real app production, password harus di-hash!
                .single();

            if (error || !data) {
                throw new Error("Username atau Password salah!");
            }

            // 2. Login Sukses! Simpan data ke LocalStorage
            localStorage.setItem('keenan_admin_token', 'logged_in_securely'); // Token dummy
            localStorage.setItem('keenan_admin_name', data.full_name);
            localStorage.setItem('keenan_admin_role', data.role); // 'superadmin' atau 'admin'
            localStorage.setItem('keenan_admin_scope', data.scope); // 'all' atau 'Luxe Seturan'

            // 3. Arahkan sesuai Role
            if (data.role === 'superadmin') {
                alert(`Selamat Datang, ${data.full_name}! (Mode Superadmin)`);
                navigate('/admin/dashboard');
            } else {
                alert(`Selamat Datang, ${data.full_name}! (Cabang: ${data.scope})`);
                navigate('/admin/calendar'); // Admin biasa langsung ke kalender aja biar fokus kerja
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-keenan-dark mb-2">Keenan Admin</h1>
                    <p className="text-xs text-gray-400 uppercase tracking-[0.2em]">Management System</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm mb-6 border border-red-100 animate-pulse">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-gray-300" size={18} />
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold transition-all font-bold text-keenan-dark"
                                placeholder="Masukan username..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-300" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold transition-all font-bold text-keenan-dark"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "LOGIN SYSTEM"}
                    </button>
                </form>

                <p className="text-center text-[10px] text-gray-300 mt-8 uppercase tracking-widest">
                    &copy; 2026 Keenan Living Group
                </p>
            </div>
        </div>
    );
}