import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Calendar, Search,
    CheckCircle, XCircle, Clock, Loader2, User,
    LogIn, LogOut as LogOutIcon, X, Globe, Smartphone,
    Printer, Phone, Mail, MapPin, CalendarDays, MessageSquare,
    CreditCard, ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [adminName, setAdminName] = useState('');
    const [scope, setScope] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // STATE UNTUK MODAL DETAIL
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const name = localStorage.getItem('keenan_admin_name') || 'Admin';
        const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';
        setAdminName(name);
        setScope(adminScope);
        fetchBookings(adminScope);
    }, []);

    const fetchBookings = async (adminScope: string) => {
        setLoading(true);
        try {
            let query = supabase
                .from('bookings')
                .select(`*, room_types ( name ), properties ( id, name )`)
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            const allBookings = data || [];
            const filteredData = allBookings.filter(booking => {
                if (adminScope === 'all') return true;
                const propertyName = booking.properties?.name || '';
                return propertyName.toLowerCase().includes(adminScope.toLowerCase());
            });

            setBookings(filteredData);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSourceCount = (sourceName: string) => {
        return bookings.filter(b => (b.booking_source || 'website') === sourceName).length;
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedBooking) return;
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('id', selectedBooking.id);

            if (error) throw error;

            const updatedBookings = bookings.map(b =>
                b.id === selectedBooking.id ? { ...b, status: newStatus } : b
            );
            setBookings(updatedBookings);
            setSelectedBooking({ ...selectedBooking, status: newStatus });

            alert(`Berhasil ubah status menjadi: ${newStatus.toUpperCase()}`);
            if (newStatus === 'checked_out') setSelectedBooking(null);

        } catch (err: any) {
            alert("Gagal update: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('keenan_admin_token');
        navigate('/admin/login');
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> PAID / CONFIRMED</span>;
            case 'checked_in': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><LogIn size={12} /> CHECKED IN</span>;
            case 'checked_out': return <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><LogOutIcon size={12} /> CHECKED OUT</span>;
            case 'pending_payment': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12} /> PENDING</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> CANCELLED</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
        }
    };

    const getSourceBadge = (source: string = 'website') => {
        const s = source?.toLowerCase() || 'website';
        if (s.includes('agoda')) return <span className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1"><Smartphone size={10} /> AGODA</span>;
        if (s.includes('traveloka')) return <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1"><Smartphone size={10} /> TRAVELOKA</span>;
        if (s.includes('tiket')) return <span className="text-[10px] font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded border border-yellow-200 flex items-center gap-1"><Smartphone size={10} /> TIKET.COM</span>;
        if (s === 'walk_in') return <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1"><User size={10} /> WALK-IN</span>;
        return <span className="text-[10px] font-bold px-2 py-1 bg-keenan-gold/10 text-keenan-gold rounded border border-keenan-gold/20 flex items-center gap-1"><Globe size={10} /> WEBSITE</span>;
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
            <div className="flex-1 md:ml-64 p-8">
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

                {/* --- STATISTIK SUMBER BOOKING (OTA) --- */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {['website', 'agoda', 'traveloka', 'tiket.com', 'walk_in'].map((src) => (
                        <div key={src} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:-translate-y-1 transition-transform cursor-default">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{src.replace('_', ' ')}</span>
                            <span className="text-2xl font-bold text-keenan-dark">{getSourceCount(src)}</span>
                        </div>
                    ))}
                </div>

                {/* Filter & Search */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 justify-between items-center border border-gray-100">
                    <div className="flex gap-2">
                        {['all', 'paid', 'checked_in', 'checked_out', 'pending_payment'].map((stat) => (
                            <button key={stat} onClick={() => setFilter(stat)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === stat ? 'bg-keenan-dark text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
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
                                            <p className="font-bold text-xs">{booking.room_types?.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase">{booking.properties?.name}</p>
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
                    {/* LEBARKAN MAX-WIDTH DISINI: max-w-5xl */}
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
                                            <p className="font-bold text-keenan-dark text-lg">{selectedBooking.properties?.name}</p>
                                            <p className="text-sm text-gray-500">{selectedBooking.room_types?.name}</p>
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
                                {selectedBooking.status === 'checked_in' && (
                                    <button onClick={() => handleStatusUpdate('checked_out')} disabled={isUpdating} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"><LogOutIcon size={18} /> Process Check-Out</button>
                                )}

                                {selectedBooking.status !== 'cancelled' && (
                                    <button onClick={() => window.open(`/admin/invoice/${selectedBooking.id}`, '_blank')} className="px-6 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
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