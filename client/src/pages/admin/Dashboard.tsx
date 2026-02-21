import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut as LogOutIcon, Calendar, Search,
    CheckCircle, XCircle, Clock, Loader2, User,
    LogIn, X, Globe, Smartphone, Printer, Phone, Mail, MapPin, MessageSquare, CreditCard, DollarSign, TrendingUp, Users, FileText
} from 'lucide-react';

// --- NEW COMPONENT: DONUT CHART ---
const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let currentAngle = 0;

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <div className="w-32 h-32 rounded-full border-8 border-gray-100 mb-4"></div>
                <p className="text-xs">No data</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
                {data.map((item, index) => {
                    const percentage = (item.value / total) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -currentAngle;
                    currentAngle += percentage;

                    return (
                        <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="15"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500 ease-in-out hover:stroke-width-[18px] cursor-pointer"
                        >
                            <title>{item.label}: {item.value}</title>
                        </circle>
                    );
                })}
            </svg>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        {item.label} ({item.value})
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    // User State
    const [adminName, setAdminName] = useState('');
    const [scope, setScope] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // --- NEW ANALYTICS STATE ---
    const [stats, setStats] = useState({
        totalRevenue: 0,
        confirmedCount: 0,
        pendingRevenue: 0,
        averageBooking: 0,
        statusDist: [] as { label: string, value: number, color: string }[],
        monthlyTrend: new Array(6).fill(0),
        venueRevenue: [] as { name: string, rev: number }[],
        channelDist: [] as { name: string, count: number }[]
    });

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
            let data = response.data || [];

            if (adminScope && adminScope !== 'all') {
                data = data.filter((b: any) => b.property?.name === adminScope);
            }

            setBookings(data);
            calculateDashboardStats(data); // Hitung stats setelah data di fetch
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC PERHITUNGAN STATISTIK ---
    const calculateDashboardStats = (data: any[]) => {
        let tRev = 0;
        let cCount = 0;
        let pRev = 0;
        let statusCounts = { paid: 0, confirmed: 0, pending: 0, checked_in: 0, checked_out: 0, cancelled: 0 };
        let venueRev: Record<string, number> = {};
        let channelCount: Record<string, number> = {};
        
        // Buat array untuk 6 bulan terakhir
        const currentMonth = new Date().getMonth();
        let mTrend = new Array(6).fill(0);

        data.forEach(b => {
            const price = Number(b.total_price) || 0;
            const status = b.status?.toLowerCase() || 'pending';
            const source = b.booking_source?.toLowerCase() || 'website';
            const venue = b.property?.name || 'Unknown';

            // Hitung Status
            statusCounts[status as keyof typeof statusCounts] = (statusCounts[status as keyof typeof statusCounts] || 0) + 1;

            // Hitung Revenue Utama (Hanya yang confirmed/paid/checked_in/out)
            if (['paid', 'confirmed', 'checked_in', 'checked_out'].includes(status)) {
                tRev += price;
                cCount++;
                venueRev[venue] = (venueRev[venue] || 0) + price;
                
                // Hitung Trend Bulanan (6 bulan terakhir)
                if (b.check_in_date) {
                    const bMonth = new Date(b.check_in_date).getMonth();
                    // Simpel logic: cari jarak bulan ke bulan sekarang
                    let diff = currentMonth - bMonth;
                    if (diff < 0) diff += 12; // Handle lintas tahun
                    if (diff < 6) {
                        // Index 0 adalah bulan terlama (current - 5), index 5 adalah bulan ini (current)
                        mTrend[5 - diff] += price; 
                    }
                }
            } else if (status === 'pending') {
                pRev += price;
            }

            // Hitung Channel (Semua status kecuali cancelled)
            if (status !== 'cancelled') {
                channelCount[source] = (channelCount[source] || 0) + 1;
            }
        });

        // Format data untuk Donut Chart
        const sDist = [
            { label: 'Paid/Conf', value: statusCounts.paid + statusCounts.confirmed, color: '#F59E0B' }, // Kuning
            { label: 'Pending', value: statusCounts.pending, color: '#3B82F6' }, // Biru
            { label: 'Checked In', value: statusCounts.checked_in, color: '#10B981' }, // Hijau
            { label: 'Cancelled', value: statusCounts.cancelled, color: '#EF4444' }, // Merah
        ].filter(item => item.value > 0);

        // Format Top Venues
        const vRevFormatted = Object.entries(venueRev)
            .map(([name, rev]) => ({ name, rev }))
            .sort((a, b) => b.rev - a.rev).slice(0, 5); // Ambil top 5

        // Format Channels (Event Types equivalent)
        const cDistFormatted = Object.entries(channelCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        setStats({
            totalRevenue: tRev,
            confirmedCount: cCount,
            pendingRevenue: pRev,
            averageBooking: cCount > 0 ? tRev / cCount : 0,
            statusDist: sDist,
            monthlyTrend: mTrend,
            venueRevenue: vRevFormatted,
            channelDist: cDistFormatted
        });
    };

    // --- HELPER FUNCTIONS ---
    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedBooking) return;
        setIsUpdating(true);
        try {
            await api.put(`/admin/bookings/${selectedBooking.id}/status`, { status: newStatus });
            const updatedBookings = bookings.map(b => b.id === selectedBooking.id ? { ...b, status: newStatus } : b);
            setBookings(updatedBookings);
            setSelectedBooking({ ...selectedBooking, status: newStatus });
            calculateDashboardStats(updatedBookings); // Recalculate stats
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

    const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    
    // Label bulan untuk chart trend
    const getMonthLabels = () => {
        const labels = [];
        const d = new Date();
        for(let i=5; i>=0; i--) {
            const pastD = new Date(d.getFullYear(), d.getMonth() - i, 1);
            labels.push(pastD.toLocaleDateString('en-US', {month: 'short'}));
        }
        return labels;
    }

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

    const getSourceBadge = (source: string = 'website') => {
        const s = source?.toLowerCase() || 'website';
        if (s.includes('agoda')) return <span className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> AGODA</span>;
        if (s.includes('traveloka')) return <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TRAVELOKA</span>;
        if (s.includes('tiket')) return <span className="text-[10px] font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded border border-yellow-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TIKET.COM</span>;
        if (s === 'walk_in' || s === 'walk-in' || s.includes('walk')) return <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1 w-fit"><User size={10} /> WALK-IN</span>;
        return <span className="text-[10px] font-bold px-2 py-1 bg-keenan-gold/10 text-keenan-gold rounded border border-keenan-gold/20 flex items-center gap-1 w-fit uppercase"><Globe size={10} /> {s.replace(/[-_]/g, ' ')}</span>;
    };

    const displayBookings = bookings.filter(b => {
        const matchesStatus = filter === 'all' || b.status === filter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (b.customer_name?.toLowerCase() || '').includes(searchLower) || (b.booking_code?.toLowerCase() || '').includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-800">
            {/* SIDEBAR - TETAP DIPERTAHANKAN */}
            <div className="w-64 bg-white border-r border-gray-100 p-6 hidden md:flex flex-col fixed h-full z-10">
                <div className="mb-10 text-center">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">KEENAN</h2>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 font-bold">Workspace</p>
                </div>
                <nav className="space-y-1">
                    <button className="w-full flex items-center gap-3 bg-blue-50 text-blue-700 p-3 rounded-xl font-bold"><LayoutDashboard size={18} /> Dashboard</button>
                    <button onClick={() => navigate('/admin/calendar')} className="w-full flex items-center gap-3 hover:bg-gray-50 p-3 rounded-xl text-gray-500 font-medium transition-all"><Calendar size={18} /> Calendar</button>
                </nav>
                <button onClick={handleLogout} className="mt-auto flex items-center justify-center gap-2 p-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 font-bold text-sm transition-colors">
                    <LogOutIcon size={18} /> Logout
                </button>
            </div>

            {/* MAIN CONTENT - DESAIN BARU */}
            <div className="flex-1 md:ml-64 p-6 lg:p-8 overflow-x-hidden"> 
                
                {/* Header Profile */}
                <div className="flex justify-end items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="font-bold text-sm text-gray-900">{adminName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{scope}</p>
                        </div>
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"><User size={20} /></div>
                    </div>
                </div>

                {/* --- 4 TOP CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start text-gray-500 mb-2">
                            <span className="text-xs font-semibold">Total Revenue</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.totalRevenue)}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">From paid bookings</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start text-gray-500 mb-2">
                            <span className="text-xs font-semibold">Confirmed Bookings</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.confirmedCount}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Active confirmed bookings</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start text-gray-500 mb-2">
                            <span className="text-xs font-semibold">Pending Revenue</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.pendingRevenue)}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">From pending bookings</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start text-gray-500 mb-2">
                            <span className="text-xs font-semibold">Average Booking</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.averageBooking)}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Per confirmed booking</p>
                        </div>
                    </div>
                </div>

                {/* --- 4 CHARTS GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                    
                    {/* 1. REVENUE TREND (Line Chart Simpel) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-800 mb-1">Revenue Trend</h3>
                        <p className="text-[10px] text-gray-400 mb-6">Revenue over the last 6 months</p>
                        
                        <div className="relative h-48 w-full flex items-end justify-between pt-4">
                            {/* Garis Horizontal Latar */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-gray-100 w-full h-0"></div>)}
                            </div>
                            
                            {/* Titik Line Chart Sederhana menggunakan div */}
                            <div className="absolute inset-0 flex items-end justify-between px-2 pb-6">
                                {stats.monthlyTrend.map((val, i) => {
                                    const max = Math.max(...stats.monthlyTrend, 1);
                                    const heightPercent = (val / max) * 100;
                                    return (
                                        <div key={i} className="flex flex-col items-center group relative h-full justify-end w-4">
                                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[9px] px-2 py-1 rounded transition-opacity z-10 whitespace-nowrap">
                                                {formatRupiah(val)}
                                            </div>
                                            {/* Titik Hijau */}
                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-green-500 bg-white z-0" style={{ marginBottom: `calc(${heightPercent}% - 5px)` }}></div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Label Bulan */}
                            <div className="absolute bottom-0 w-full flex justify-between text-[9px] text-gray-400 font-medium px-1">
                                {getMonthLabels().map((m, i) => <span key={i}>{m}</span>)}
                            </div>
                        </div>
                    </div>

                    {/* 2. BOOKING STATUS (Donut Chart) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-800 mb-1">Booking Status</h3>
                        <p className="text-[10px] text-gray-400 mb-6">Distribution of booking statuses</p>
                        <DonutChart data={stats.statusDist} />
                    </div>

                    {/* 3. REVENUE BY VENUE (List) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-800 mb-1">Revenue by Venue</h3>
                        <p className="text-[10px] text-gray-400 mb-6">Top performing venues</p>
                        
                        {stats.venueRevenue.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No venue data available</div>
                        ) : (
                            <div className="space-y-4">
                                {stats.venueRevenue.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 truncate pr-4">{v.name}</span>
                                        <span className="text-sm font-bold text-gray-900">{formatRupiah(v.rev)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. EVENT TYPES / CHANNELS (Bar Chart) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-800 mb-1">Booking Channels</h3>
                        <p className="text-[10px] text-gray-400 mb-6">Distribution by channel source</p>

                        <div className="h-40 w-full flex items-end justify-around pb-6 border-b border-gray-100 relative">
                            {/* Garis Latar */}
                            <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none">
                                {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-gray-100 w-full h-0"></div>)}
                            </div>

                            {stats.channelDist.slice(0, 4).map((c, i) => {
                                const max = Math.max(...stats.channelDist.map(x => x.count), 1);
                                const h = (c.count / max) * 100;
                                return (
                                    <div key={i} className="w-12 md:w-16 flex flex-col items-center group relative h-full justify-end z-10">
                                        <div className="absolute -top-6 text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{c.count}</div>
                                        <div className="w-full bg-[#A855F7] rounded-t-sm transition-all hover:bg-[#9333EA]" style={{ height: `${h}%` }}></div>
                                        <span className="absolute -bottom-5 text-[9px] font-semibold text-gray-500 capitalize">{c.name.replace(/_/g, ' ')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* --- TABEL TRANSAKSI --- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="p-5 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50 rounded-t-2xl">
                        <div className="flex gap-2 overflow-x-auto">
                            {['all', 'paid', 'checked_in', 'checked_out', 'pending'].map((stat) => (
                                <button key={stat} onClick={() => setFilter(stat)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === stat ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
                                    {stat.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                            <input type="text" placeholder="Search booking..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-400 uppercase text-[9px] tracking-widest font-bold border-b border-gray-100">
                                <tr>
                                    <th className="p-4 pl-6">Ref ID</th>
                                    <th className="p-4">Guest</th>
                                    <th className="p-4">Venue & Room</th>
                                    <th className="p-4">Dates</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right pr-6">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {displayBookings.map((booking) => (
                                    <tr key={booking.id}
                                        onClick={() => setSelectedBooking(booking)}
                                        className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                                    >
                                        <td className="p-4 pl-6">
                                            <p className="font-mono text-xs font-semibold text-gray-800">#{booking.booking_code}</p>
                                            <div className="mt-1">{getSourceBadge(booking.booking_source)}</div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-800 text-xs">{booking.customer_name}</p>
                                            <p className="text-[10px] text-gray-500">{booking.customer_phone}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-gray-800 text-xs">{booking.property?.name}</p>
                                            <p className="text-[10px] text-gray-500">{booking.room_type?.name}</p>
                                        </td>
                                        <td className="p-4 text-gray-500 text-[10px] font-medium">
                                            {new Date(booking.check_in_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} → {new Date(booking.check_out_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="p-4">{getStatusBadge(booking.status)}</td>
                                        <td className="p-4 pr-6 text-right font-bold text-gray-800 text-xs">
                                            {formatRupiah(booking.total_price)}
                                        </td>
                                    </tr>
                                ))}
                                {displayBookings.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic text-xs">No bookings found matching your criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* --- MODAL DETAIL (TETAP SAMA SEPERTI SEBELUMNYA) --- */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                        {/* KOLOM KIRI: GUEST PROFILE (35%) */}
                        <div className="w-full md:w-[35%] bg-gray-50 p-8 border-r border-gray-100 overflow-y-auto">
                            <div className="mb-6 text-center">
                                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-serif font-bold">
                                    {selectedBooking.customer_name.charAt(0)}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedBooking.customer_name}</h3>
                                <div className="flex justify-center mt-2">{getSourceBadge(selectedBooking.booking_source)}</div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Contact Info</label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="bg-green-100 p-2 rounded-lg text-green-600"><Phone size={14} /></div>
                                            <p className="text-sm font-semibold text-gray-700">{selectedBooking.customer_phone || '-'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Mail size={14} /></div>
                                            <p className="text-sm font-semibold text-gray-700 truncate">{selectedBooking.customer_email || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                        <MessageSquare size={12} /> Guest Notes
                                    </label>
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-gray-600 italic">
                                        "{selectedBooking.customer_notes || 'No special request.'}"
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KOLOM KANAN: BOOKING DETAILS (65%) */}
                        <div className="w-full md:w-[65%] p-8 overflow-y-auto flex flex-col">

                            <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Booking ID</p>
                                    <h2 className="text-2xl font-mono font-bold text-gray-900">#{selectedBooking.booking_code}</h2>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(selectedBooking.created_at).toLocaleString('en-US')}</p>
                                </div>
                                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"><X size={24} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Room Information</label>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><MapPin size={20} /></div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">{selectedBooking.property?.name}</p>
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
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Check-In</p>
                                        <p className="font-bold text-sm text-gray-900 mt-1">{new Date(selectedBooking.check_in_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="text-gray-300">➜</div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Check-Out</p>
                                        <p className="font-bold text-sm text-gray-900 mt-1">{new Date(selectedBooking.check_out_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                                        <CreditCard size={16} /> Total Paid
                                    </div>
                                    <div className="text-2xl font-black text-gray-900">
                                        {formatRupiah(selectedBooking.total_price)}
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div className="mt-auto flex gap-3">
                                {selectedBooking.status === 'paid' && (
                                    <button onClick={() => handleStatusUpdate('checked_in')} disabled={isUpdating} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"><LogIn size={18} /> Process Check-In</button>
                                )}
                                {selectedBooking.status === 'confirmed' && (
                                    <button onClick={() => handleStatusUpdate('checked_in')} disabled={isUpdating} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center gap-2"><LogIn size={18} /> Process Check-In</button>
                                )}
                                {selectedBooking.status === 'checked_in' && (
                                    <button onClick={() => handleStatusUpdate('checked_out')} disabled={isUpdating} className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2"><LogOutIcon size={18} /> Process Check-Out</button>
                                )}

                                {selectedBooking.status !== 'cancelled' && (
                                    <button onClick={() => window.print()} className="px-6 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center gap-2 transition-all">
                                        <Printer size={18} /> Print
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