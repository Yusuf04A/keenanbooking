import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Calendar, Search,
    CheckCircle, XCircle, Clock, Loader2, User
} from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [adminName, setAdminName] = useState('');
    const [scope, setScope] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // 1. Ambil data admin dari localStorage
        const name = localStorage.getItem('keenan_admin_name') || 'Admin';
        const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';

        setAdminName(name);
        setScope(adminScope);

        // 2. Ambil data booking
        fetchBookings(adminScope);
    }, []);

    const fetchBookings = async (adminScope: string) => {
        setLoading(true);
        try {
            let query = supabase
                .from('bookings')
                .select(`
                    *,
                    room_types ( name ),
                    properties ( id, name )
                `)
                .order('created_at', { ascending: false });

            // FILTER LOGIC: Jika bukan 'all', filter berdasarkan nama properti atau ID
            // Sesuaikan dengan logic di Login.tsx kamu
            if (adminScope && adminScope !== 'all') {
                // Mencari booking yang memiliki relasi ke nama property yang sesuai scope
                query = query.filter('properties.name', 'eq', adminScope);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Karena Supabase .filter pada join table kadang mengembalikan data null untuk join-nya,
            // kita bersihkan datanya di sini (client-side filter sebagai pengaman)
            const cleanedData = adminScope !== 'all'
                ? (data || []).filter(b => b.properties && b.properties.name === adminScope)
                : (data || []);

            setBookings(cleanedData);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('keenan_admin_token');
        localStorage.removeItem('keenan_admin_name');
        localStorage.removeItem('keenan_admin_scope');
        navigate('/admin/login');
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> PAID</span>;
            case 'pending_payment':
                return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12} /> PENDING</span>;
            case 'cancelled':
                return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> CANCEL</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    // Filter by Status & Search Term
    const filteredBookings = bookings.filter(b => {
        const matchesStatus = filter === 'all' || b.status === filter;
        const matchesSearch = b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.booking_code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-keenan-gold">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-serif italic tracking-widest">Loading Keenan Management System...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">

            {/* SIDEBAR */}
            <div className="w-64 bg-keenan-dark text-white p-6 hidden md:block fixed h-full shadow-2xl">
                <div className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-keenan-gold tracking-tighter">KEENAN</h2>
                    <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">Living Group</p>
                </div>

                <nav className="space-y-2">
                    <button className="w-full flex items-center gap-3 bg-keenan-gold/10 text-keenan-gold p-3 rounded-lg font-bold transition-all border-l-4 border-keenan-gold">
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button className="w-full flex items-center gap-3 hover:bg-white/5 p-3 rounded-lg text-gray-400 transition-all">
                        <Calendar size={20} /> Calendar
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="absolute bottom-8 left-6 right-6 flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/30 text-red-400 hover:bg-red-500 hover:text-white transition-all group"
                >
                    <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span className="font-bold text-sm uppercase tracking-widest">Logout</span>
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-8">

                {/* Header dengan Profile */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-keenan-dark">Overview</h1>
                        <p className="text-gray-400 text-sm mt-1">Sistem Manajemen Reservasi Terpadu</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-3 pr-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="text-right">
                            <p className="font-bold text-sm text-keenan-dark">{adminName}</p>
                            <p className="text-[10px] text-keenan-gold font-bold uppercase tracking-widest">{scope}</p>
                        </div>
                        <div className="w-12 h-12 bg-keenan-dark text-keenan-gold rounded-xl flex items-center justify-center shadow-inner border border-keenan-gold/20">
                            <User size={24} />
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white p-7 rounded-2xl shadow-sm border-b-4 border-green-500 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform">
                            <CheckCircle size={100} />
                        </div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Revenue (Paid)</p>
                        <p className="text-3xl font-bold mt-2 text-keenan-dark">
                            {formatRupiah(bookings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.total_price, 0))}
                        </p>
                    </div>

                    <div className="bg-white p-7 rounded-2xl shadow-sm border-b-4 border-keenan-gold relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform">
                            <LayoutDashboard size={100} />
                        </div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Total Bookings</p>
                        <p className="text-3xl font-bold mt-2 text-keenan-dark">{bookings.length}</p>
                    </div>

                    <div className="bg-white p-7 rounded-2xl shadow-sm border-b-4 border-orange-400 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform">
                            <Clock size={100} />
                        </div>
                        <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Pending Payment</p>
                        <p className="text-3xl font-bold mt-2 text-keenan-dark">{bookings.filter(b => b.status === 'pending_payment').length}</p>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">

                    {/* Filter & Search Bar */}
                    <div className="p-6 border-b flex flex-wrap gap-6 justify-between items-center">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            {['all', 'paid', 'pending_payment', 'cancelled'].map((stat) => (
                                <button
                                    key={stat}
                                    onClick={() => setFilter(stat)}
                                    className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-tighter transition-all ${filter === stat
                                            ? 'bg-white text-keenan-dark shadow-sm'
                                            : 'text-gray-400 hover:text-keenan-dark'
                                        }`}
                                >
                                    {stat.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search size={18} className="absolute left-4 top-3 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Cari Kode atau Nama..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-keenan-gold/20 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-[0.2em] font-bold">
                                <tr>
                                    <th className="p-6">Booking Code</th>
                                    <th className="p-6">Guest Info</th>
                                    <th className="p-6">Property & Room</th>
                                    <th className="p-6">Stay Period</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredBookings.length > 0 ? filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-keenan-cream/20 transition-colors group">
                                        <td className="p-6">
                                            <span className="font-mono font-bold text-keenan-dark bg-gray-100 px-3 py-1 rounded-md group-hover:bg-keenan-gold group-hover:text-white transition-colors">
                                                {booking.booking_code}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-keenan-dark">{booking.customer_name}</p>
                                            <p className="text-gray-400 text-[11px]">{booking.customer_email}</p>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-bold text-gray-700">{booking.room_types?.name}</p>
                                            <p className="text-[11px] text-keenan-gold font-bold uppercase">{booking.properties?.name}</p>
                                        </td>
                                        <td className="p-6 text-gray-600">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{new Date(booking.check_in_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                                <span className="text-[10px] text-gray-300 mx-auto">▼</span>
                                                <span className="text-xs font-bold">{new Date(booking.check_out_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 font-bold text-keenan-dark">
                                            {formatRupiah(booking.total_price)}
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(booking.status)}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center">
                                            <div className="flex flex-col items-center opacity-20">
                                                <Search size={48} />
                                                <p className="mt-4 font-serif italic">No reservations found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}