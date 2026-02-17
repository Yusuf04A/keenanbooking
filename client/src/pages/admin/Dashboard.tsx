import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut as LogOutIcon, Calendar, Search,
    CheckCircle, XCircle, Clock, Loader2, User,
    LogIn, X, Globe, Smartphone,
    Printer, Phone, Mail, MapPin, MessageSquare,
    CreditCard
} from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    // User State
    const [adminName, setAdminName] = useState('');
    const [scope, setScope] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // STATE UNTUK MODAL DETAIL
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('keenan_admin_role');
        const name = localStorage.getItem('keenan_admin_name') || 'Staff';
        const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';

        if (role === 'superadmin') {
            navigate('/superadmin/dashboard');
            return;
        }

        setAdminName(name);
        setScope(adminScope);

        fetchBookings(adminScope);
    }, [navigate]);

    const fetchBookings = async (adminScope: string) => {
        setLoading(true);
        try {
            const response = await api.get('/admin/bookings');
            let data = response.data;

            if (adminScope && adminScope !== 'all') {
                data = data.filter((b: any) => b.property?.name === adminScope);
            }

            setBookings(data || []);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC BARU: HITUNG SUMBER SECARA DINAMIS ---
    const getSourceStats = () => {
        const stats: Record<string, number> = {};

        // 1. Inisialisasi default agar tetap muncul walau 0
        const defaults = ['website', 'agoda', 'traveloka', 'tiket', 'walk_in'];
        defaults.forEach(d => stats[d] = 0);

        // 2. Hitung dari data booking yang ada
        bookings.forEach(b => {
            // Normalisasi nama (trip.com -> trip_com -> trip com)
            let source = (b.booking_source || 'website').toLowerCase().replace(/[-.]/g, '_');

            // Handle variasi penulisan manual
            if (source === 'walk in') source = 'walk_in';
            if (source === 'tiket.com') source = 'tiket';

            stats[source] = (stats[source] || 0) + 1;
        });

        return Object.entries(stats);
    };

    // UPDATE STATUS
    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedBooking) return;
        setIsUpdating(true);

        try {
            await api.put(`/admin/bookings/${selectedBooking.id}/status`, { status: newStatus });

            const updatedBookings = bookings.map(b =>
                b.id === selectedBooking.id ? { ...b, status: newStatus } : b
            );

            setBookings(updatedBookings);
            setSelectedBooking({ ...selectedBooking, status: newStatus });

            alert(`Berhasil ubah status menjadi: ${newStatus.toUpperCase().replace('_', ' ')}`);

            if (newStatus === 'checked_out') setSelectedBooking(null);

        } catch (err: any) {
            console.error(err);
            alert("Gagal update status.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        try { await api.post('/logout'); } catch (e) { }
        localStorage.clear();
        navigate('/admin/login');
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> PAID / CONFIRMED</span>;
            case 'confirmed': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> PAID / CONFIRMED</span>;
            case 'checked_in': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><LogIn size={12} /> CHECKED IN</span>;
            case 'checked_out': return <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><LogOutIcon size={12} /> CHECKED OUT</span>;
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12} /> PENDING</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> CANCELLED</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    const getPlatformColor = (name: string) => {
        const colors = [
            'bg-red-100 text-red-700 border-red-200',
            'bg-orange-100 text-orange-700 border-orange-200',
            'bg-amber-100 text-amber-700 border-amber-200',
            'bg-lime-100 text-lime-700 border-lime-200',
            'bg-emerald-100 text-emerald-700 border-emerald-200',
            'bg-teal-100 text-teal-700 border-teal-200',
            'bg-cyan-100 text-cyan-700 border-cyan-200',
            'bg-sky-100 text-sky-700 border-sky-200',
            'bg-indigo-100 text-indigo-700 border-indigo-200',
            'bg-violet-100 text-violet-700 border-violet-200',
            'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
            'bg-pink-100 text-pink-700 border-pink-200',
            'bg-rose-100 text-rose-700 border-rose-200',
        ];

        // Buat hash sederhana dari string nama
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Pilih warna berdasarkan index hash
        return colors[Math.abs(hash) % colors.length];
    };

    const getSourceBadge = (source: string = 'website') => {
        const s = source?.toLowerCase() || 'website';

        // 1. Platform Besar (Hardcoded Warna Brand Asli)
        if (s.includes('agoda')) return <span className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> AGODA</span>;
        if (s.includes('traveloka')) return <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TRAVELOKA</span>;
        if (s.includes('tiket')) return <span className="text-[10px] font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded border border-yellow-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TIKET.COM</span>;
        if (s.includes('booking')) return <span className="text-[10px] font-bold px-2 py-1 bg-blue-900 text-white rounded border border-blue-800 flex items-center gap-1 w-fit"><Smartphone size={10} /> BOOKING.COM</span>;
        if (s === 'walk_in' || s === 'walk-in' || s.includes('walk')) return <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1 w-fit"><User size={10} /> WALK-IN</span>;
        if (s === 'website') return <span className="text-[10px] font-bold px-2 py-1 bg-keenan-gold/10 text-keenan-gold rounded border border-keenan-gold/20 flex items-center gap-1 w-fit"><Globe size={10} /> WEBSITE</span>;

        // 2. Platform Baru/Custom (Warna Warni Otomatis)
        const dynamicColorClass = getPlatformColor(s);

        return (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 w-fit uppercase ${dynamicColorClass}`}>
                <Globe size={10} /> {s.replace(/[-_]/g, ' ')}
            </span>
        );
    };

    const displayBookings = bookings.filter(b => {
        const matchesStatus = filter === 'all' || b.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (b.customer_name?.toLowerCase() || '').includes(searchLower) || (b.booking_code?.toLowerCase() || '').includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
            {/* SIDEBAR */}
            <div className="w-64 bg-keenan-dark text-white p-6 hidden md:block fixed h-full shadow-2xl z-10">
                <div className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-keenan-gold tracking-tighter">KEENAN</h2>
                    <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">Living Group</p>
                </div>
                <nav className="space-y-2">
                    <button className="w-full flex items-center gap-3 bg-keenan-gold/10 text-keenan-gold p-3 rounded-lg font-bold border-l-4 border-keenan-gold"><LayoutDashboard size={20} /> Dashboard</button>
                    <button onClick={() => navigate('/admin/calendar')} className="w-full flex items-center gap-3 hover:bg-white/5 p-3 rounded-lg text-gray-400 transition-all"><Calendar size={20} /> Calendar</button>
                </nav>
                <button onClick={handleLogout} className="absolute bottom-8 left-6 right-6 flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/30 text-red-400 hover:bg-red-500 hover:text-white transition-all group">
                    <LogOutIcon size={18} /> <span className="font-bold text-sm uppercase tracking-widest">Logout</span>
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-8 overflow-hidden"> {/* overflow-hidden biar ga scroll body */}
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-keenan-dark">Overview</h1>
                        <p className="text-gray-400 text-sm mt-1">Booking Performance & Sources</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-3 pr-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-right">
                            <p className="font-bold text-sm text-keenan-dark">{adminName}</p>
                            <p className="text-[10px] text-keenan-gold font-bold uppercase tracking-widest">{scope}</p>
                        </div>
                        <div className="w-12 h-12 bg-keenan-dark text-keenan-gold rounded-xl flex items-center justify-center"><User size={24} /></div>
                    </div>
                </div>

                {/* --- STATISTIK SUMBER BOOKING (SCROLLABLE & DINAMIS) --- */}
                {/* KITA GUNAKAN FLEX DENGAN OVERFLOW-X-AUTO AGAR BISA DIGESER */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {getSourceStats().map(([source, count]) => (
                        <div key={source} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:-translate-y-1 transition-transform cursor-default min-w-[140px] flex-shrink-0 snap-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{source.replace(/_/g, ' ')}</span>
                            <span className="text-3xl font-bold text-keenan-dark">{count}</span>
                        </div>
                    ))}
                </div>

                {/* Filter & Search */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 justify-between items-center border border-gray-100">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['all', 'paid', 'checked_in', 'checked_out', 'pending'].map((stat) => (
                            <button key={stat} onClick={() => setFilter(stat)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === stat ? 'bg-keenan-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {stat.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder="Cari Tamu / Kode..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm outline-none focus:ring-1 focus:ring-keenan-gold"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-[0.2em] font-bold">
                                <tr>
                                    <th className="p-6">Source</th>
                                    <th className="p-6">Guest Info</th>
                                    <th className="p-6">Room</th>
                                    <th className="p-6">Dates</th>
                                    <th className="p-6 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayBookings.map((booking) => (
                                    <tr key={booking.id}
                                        onClick={() => setSelectedBooking(booking)}
                                        className="hover:bg-keenan-gold/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-6">
                                            {getSourceBadge(booking.booking_source)}
                                            <p className="font-mono text-xs text-gray-400 mt-2">{booking.booking_code}</p>
                                        </td>
                                        <td className="p-6 font-bold text-gray-700">
                                            {booking.customer_name}
                                            <p className="text-[10px] text-gray-400 font-normal">{booking.customer_phone}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-xs">{booking.room_type?.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase">{booking.property?.name}</p>
                                        </td>
                                        <td className="p-6 text-gray-500 text-xs">
                                            {new Date(booking.check_in_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - {new Date(booking.check_out_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="p-6 flex justify-center">{getStatusBadge(booking.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL DETAIL (WIDE SCREEN EDITION) --- */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                        {/* KOLOM KIRI: GUEST PROFILE (35%) */}
                        <div className="w-full md:w-[35%] bg-gray-50 p-8 border-r border-gray-100 overflow-y-auto">
                            <div className="mb-6 text-center">
                                <div className="w-20 h-20 bg-keenan-dark text-keenan-gold rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-serif font-bold">
                                    {selectedBooking.customer_name.charAt(0)}
                                </div>
                                <h3 className="text-xl font-serif font-bold text-keenan-dark">{selectedBooking.customer_name}</h3>
                                <div className="flex justify-center mt-2">{getSourceBadge(selectedBooking.booking_source)}</div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Contact Info</label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="bg-green-100 p-2 rounded-lg text-green-600"><Phone size={14} /></div>
                                            <p className="text-sm font-semibold">{selectedBooking.customer_phone || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Mail size={14} /></div>
                                            <p className="text-sm font-semibold truncate">{selectedBooking.customer_email || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block flex items-center gap-2">
                                        <MessageSquare size={12} /> Guest Notes
                                    </label>
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-gray-600 italic">
                                        "{selectedBooking.customer_notes || 'Tidak ada permintaan khusus.'}"
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KOLOM KANAN: BOOKING DETAILS (65%) */}
                        <div className="w-full md:w-[65%] p-8 overflow-y-auto flex flex-col">

                            <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Booking ID</p>
                                    <h2 className="text-2xl font-mono font-bold text-keenan-dark">#{selectedBooking.booking_code}</h2>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(selectedBooking.created_at).toLocaleString('id-ID')}</p>
                                </div>
                                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Room Information</label>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-keenan-gold/10 p-3 rounded-xl text-keenan-gold"><MapPin size={20} /></div>
                                        <div>
                                            <p className="font-bold text-keenan-dark text-lg">{selectedBooking.property?.name}</p>
                                            <p className="text-sm text-gray-500">{selectedBooking.room_type?.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Status</label>
                                    <div>{getStatusBadge(selectedBooking.status)}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Check-In</p>
                                        <p className="font-bold text-lg text-keenan-dark">{new Date(selectedBooking.check_in_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    </div>
                                    <div className="text-gray-300">➜</div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Check-Out</p>
                                        <p className="font-bold text-lg text-keenan-dark">{new Date(selectedBooking.check_out_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                                        <CreditCard size={16} /> Total Paid
                                    </div>
                                    <div className="text-2xl font-black text-keenan-gold">
                                        {formatRupiah(selectedBooking.total_price)}
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div className="mt-auto flex gap-3">
                                {selectedBooking.status === 'paid' && (
                                    <button onClick={() => handleStatusUpdate('checked_in')} disabled={isUpdating} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"><LogIn size={18} /> Process Check-In</button>
                                )}
                                {selectedBooking.status === 'confirmed' && (
                                    <button onClick={() => handleStatusUpdate('checked_in')} disabled={isUpdating} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"><LogIn size={18} /> Process Check-In</button>
                                )}
                                {selectedBooking.status === 'checked_in' && (
                                    <button onClick={() => handleStatusUpdate('checked_out')} disabled={isUpdating} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"><LogOutIcon size={18} /> Process Check-Out</button>
                                )}

                                {selectedBooking.status !== 'cancelled' && (
                                    <button onClick={() => window.print()} className="px-6 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
                                        <Printer size={20} /> Print
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}