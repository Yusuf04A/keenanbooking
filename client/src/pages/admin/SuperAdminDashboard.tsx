import { useEffect, useState } from 'react';
import { api } from '../../lib/api'; // <--- PAKE API LARAVEL
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Hotel, BedDouble, Users, BookOpen,
    Plus, Trash2, Edit, X, Loader2, ShieldCheck, UploadCloud,
    TrendingUp, Wallet, UserCheck, Filter, Globe, Calendar,
    CheckCircle, Mail, Phone, MapPin, Printer, CreditCard, Layers
} from 'lucide-react';

// --- 1. CHART GARIS (REVENUE) ---
const SimpleLineChart = ({ data }: { data: number[] }) => {
    const maxVal = Math.max(...data, 1000000);
    const max = maxVal * 1.2;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (val / max) * 100;
        return `${x},${y}`;
    }).join(' ');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="relative h-64 w-full pb-6 select-none">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f3f4f6" strokeWidth="0.5" strokeDasharray="4" />
                ))}
                <polyline
                    fill="none" stroke="#C5A059" strokeWidth="2.5" points={points}
                    vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm"
                />
                <polygon fill="url(#gradient)" points={`0,100 ${points} 100,100`} opacity="0.1" />
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#C5A059" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                {data.map((val, i) => (
                    <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - (val / max) * 100} r="2" fill="#fff" stroke="#C5A059" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="transition-all duration-300 hover:r-4 cursor-pointer">
                        <title>{months[i]}: Rp {new Intl.NumberFormat('id-ID').format(val)}</title>
                    </circle>
                ))}
            </svg>
            <div className="flex justify-between mt-4 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                {months.map(m => <span key={m} className="flex-1 text-center">{m}</span>)}
            </div>
        </div>
    );
};

// --- 2. CHART BATANG (CHANNEL) ---
const SimpleBarChart = ({ data, labels }: { data: number[], labels: string[] }) => {
    const max = Math.max(...data, 1);
    const getBarColor = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('website')) return 'bg-keenan-gold';
        if (l.includes('agoda')) return 'bg-purple-500';
        if (l.includes('traveloka')) return 'bg-blue-500';
        return 'bg-gray-400';
    };

    return (
        <div className="h-64 w-full flex flex-col justify-end">
            <div className="flex items-end justify-center gap-8 h-full pb-2 border-b border-gray-100">
                {data.map((val, i) => (
                    <div key={i} className="flex flex-col items-center group relative h-full justify-end w-16">
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-keenan-dark text-white text-[10px] px-2 py-1 rounded shadow-lg transform translate-y-2 group-hover:translate-y-0">{val} Booking</div>
                        <div className={`w-12 rounded-t-md transition-all duration-500 ease-out hover:opacity-90 ${getBarColor(labels[i])}`} style={{ height: `${Math.max((val / max) * 100, 2)}%` }}></div>
                        <div className="mt-3 text-center"><span className="text-[10px] font-bold text-gray-500 uppercase block truncate max-w-[60px]" title={labels[i]}>{labels[i]}</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'properties' | 'rooms' | 'staff' | 'platforms'>('overview');

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Data States
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [admins, setAdmins] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);

    const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
    const [analytics, setAnalytics] = useState({
        totalRevenue: 0,
        totalBookings: 0,
        monthlyRevenue: new Array(12).fill(0),
        channelStats: { labels: [], data: [] } as { labels: string[], data: number[] },
        topProperties: [] as any[]
    });

    // Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'property' | 'room' | 'staff' | 'booking_detail' | 'platform' | ''>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});

    // Config
    const facilityOptions = ["Wifi", "AC", "Breakfast", "TV", "Netflix", "Hot Water", "Parking", "Kitchen"];
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

    useEffect(() => {
        const checkUserRole = () => {
            const role = localStorage.getItem('keenan_admin_role');
            if (role !== 'superadmin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                fetchAllData();
            }
        };
        checkUserRole();
    }, [navigate]);

    useEffect(() => {
        if (!loading) calculateAnalytics();
    }, [selectedPropertyFilter, rawBookings]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [propsRes, roomsRes, staffRes, bookingsRes, platformsRes] = await Promise.all([
                api.get('/properties'),
                api.get('/admin/rooms'),
                api.get('/admin/staff'),
                api.get('/admin/bookings'),
                api.get('/admin/platforms')
            ]);

            setProperties(propsRes.data || []);
            setRooms(roomsRes.data || []);
            setAdmins(staffRes.data || []);
            setRawBookings(bookingsRes.data || []);
            setPlatforms(platformsRes.data || []);

        } catch (error: any) {
            console.error("Fetch Error:", error);
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = () => {
        const validStatuses = ['paid', 'checked_in', 'checked_out', 'confirmed'];
        const filteredBookings = rawBookings.filter(b =>
            (selectedPropertyFilter === 'all' || b.property?.id === selectedPropertyFilter) &&
            validStatuses.includes(b.status)
        );

        const totalRevenue = filteredBookings.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
        const totalBookings = filteredBookings.length;

        const months = new Array(12).fill(0);
        filteredBookings.forEach(b => {
            if (b.check_in_date) {
                const date = new Date(b.check_in_date);
                if (!isNaN(date.getTime())) months[date.getMonth()] += (Number(b.total_price) || 0);
            }
        });

        const channels: Record<string, number> = {};
        filteredBookings.forEach(b => {
            const source = (b.booking_source || 'Website').toLowerCase();
            channels[source] = (channels[source] || 0) + 1;
        });

        const channelLabels = Object.keys(channels);
        const channelData = Object.values(channels);

        const propPerformance: Record<string, number> = {};
        filteredBookings.forEach(b => {
            const pName = b.property?.name || 'Unknown';
            propPerformance[pName] = (propPerformance[pName] || 0) + (Number(b.total_price) || 0);
        });
        const sortedProps = Object.entries(propPerformance)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        setAnalytics({
            totalRevenue, totalBookings, monthlyRevenue: months,
            channelStats: { labels: channelLabels, data: channelData },
            topProperties: sortedProps
        });
    };

    const formatRupiah = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- FUNGSI HANDLE FILE UPLOAD LOKAL ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({
                ...formData,
                image_file: file, // Simpan file aslinya
                preview_url: URL.createObjectURL(file) // Buat link preview sementaranya
            });
        }
    };

    // --- CRUD HANDLERS ---
    const handleSave = async () => {
        setUploading(true);
        try {
            // PROPERTY (MENGGUNAKAN FORMDATA KARENA ADA FILE)
            if (modalType === 'property') {
                const submitData = new FormData();
                submitData.append('name', formData.name || '');
                submitData.append('address', formData.address || '');
                submitData.append('description', formData.description || '');

                if (formData.image_file) {
                    submitData.append('image', formData.image_file); // 'image' adalah nama field yg dikirim ke laravel
                }

                if (editingId) {
                    submitData.append('_method', 'PUT'); // Trik Laravel untuk update dengan file
                    await api.post(`/admin/properties/${editingId}`, submitData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    await api.post('/admin/properties', submitData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            // ROOM (MENGGUNAKAN FORMDATA KARENA ADA FILE)
            if (modalType === 'room') {
                const submitData = new FormData();
                submitData.append('property_id', formData.property_id || '');
                submitData.append('name', formData.name || '');
                submitData.append('price_daily', formData.price_daily || '');
                submitData.append('price_weekly', formData.price_weekly || '');
                submitData.append('price_monthly', formData.price_monthly || '');
                submitData.append('capacity', formData.capacity || '');
                submitData.append('total_stock', formData.total_stock || '');

                // Array facilities harus di-loop untuk masuk ke FormData
                selectedFacilities.forEach((fac, index) => {
                    submitData.append(`facilities[${index}]`, fac);
                });

                if (formData.image_file) {
                    submitData.append('image', formData.image_file);
                }

                if (editingId) {
                    submitData.append('_method', 'PUT');
                    await api.post(`/admin/rooms/${editingId}`, submitData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } else {
                    await api.post('/admin/rooms', submitData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            // STAFF
            if (modalType === 'staff') {
                const payload = { ...formData };
                if (editingId) await api.put(`/admin/staff/${editingId}`, payload);
                else await api.post('/admin/staff', payload);
            }

            // PLATFORM
            if (modalType === 'platform') {
                await api.post('/admin/platforms', { name: formData.name });
            }

            alert("Data Berhasil Disimpan!");
            closeModal();
            fetchAllData();
        } catch (error: any) {
            console.error(error);
            alert("Gagal menyimpan: " + (error.response?.data?.message || error.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (type: 'property' | 'room' | 'staff' | 'platform', id: string) => {
        if (!confirm("Are you sure you want to delete this data?")) return;
        try {
            if (type === 'property') await api.delete(`/admin/properties/${id}`);
            if (type === 'room') await api.delete(`/admin/rooms/${id}`);
            if (type === 'staff') await api.delete(`/admin/staff/${id}`);
            if (type === 'platform') await api.delete(`/admin/platforms/${id}`);
            fetchAllData();
        } catch (error) {
            alert("Gagal menghapus data.");
        }
    }

    const openModal = (type: any, data: any = null) => {
        setModalType(type);
        setEditingId(data?.id);
        // Reset preview file jika membuka modal
        setFormData({ ...data, image_file: null, preview_url: null } || {});
        setSelectedFacilities(data?.facilities || []);
        setIsModalOpen(true);
    }
    const closeModal = () => { setIsModalOpen(false); setModalType(''); }

    const handleFacilityChange = (fac: string) => {
        if (selectedFacilities.includes(fac)) setSelectedFacilities(selectedFacilities.filter(f => f !== fac));
        else setSelectedFacilities([...selectedFacilities, fac]);
    }

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (e) { }
        localStorage.clear();
        navigate('/admin/login');
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-keenan-gold" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
            {/* SIDEBAR */}
            <div className="w-64 bg-keenan-dark text-white p-6 hidden md:block fixed h-full shadow-2xl z-10">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-keenan-gold rounded-full flex items-center justify-center mx-auto mb-3 text-keenan-dark"><ShieldCheck size={32} /></div>
                    <h2 className="text-xl font-serif font-bold text-white tracking-tight">Superadmin</h2>
                </div>
                <nav className="space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-keenan-gold text-keenan-dark font-bold' : 'text-gray-400 hover:bg-white/5'}`}><LayoutDashboard size={18} /> Dashboard</button>
                    <button onClick={() => setActiveTab('bookings')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'bookings' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><BookOpen size={18} /> Bookings</button>
                    <button onClick={() => setActiveTab('properties')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'properties' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Hotel size={18} /> Properties</button>
                    <button onClick={() => setActiveTab('rooms')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'rooms' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><BedDouble size={18} /> Rooms</button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Users size={18} /> Staff</button>
                    <button onClick={() => setActiveTab('platforms')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'platforms' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Layers size={18} /> Platforms</button>
                </nav>
                <button onClick={handleLogout} className="absolute bottom-8 left-6 right-6 flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-900/20"><LogOut size={18} /> Logout</button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-8 lg:p-12">

                {/* --- TAB 1: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-end mb-8">
                            <div><h1 className="text-4xl font-serif font-bold text-keenan-dark">Overview</h1><p className="text-gray-400 text-sm mt-1">Real-time performance analytics</p></div>
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
                                <Filter size={16} className="text-gray-400 ml-2" />
                                <select className="bg-transparent font-bold text-sm text-keenan-dark outline-none cursor-pointer pr-4" value={selectedPropertyFilter} onChange={(e) => setSelectedPropertyFilter(e.target.value)}>
                                    <option value="all">All Properties</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Revenue</p><p className="text-3xl font-bold text-keenan-dark">{formatRupiah(analytics.totalRevenue)}</p></div><div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><Wallet /></div></div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Bookings</p><p className="text-3xl font-bold text-keenan-gold">{analytics.totalBookings}</p></div><div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center"><UserCheck /></div></div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"><div><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Managed Properties</p><p className="text-3xl font-bold text-blue-600">{selectedPropertyFilter === 'all' ? properties.length : 1}</p></div><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Hotel /></div></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-keenan-dark flex items-center gap-2"><TrendingUp size={20} className="text-keenan-gold" /> Revenue Trend</h3><span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Current Year</span></div>
                                <SimpleLineChart data={analytics.monthlyRevenue} />
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                                <div className="mb-auto"><h3 className="font-bold text-lg text-keenan-dark">Booking Channel</h3><p className="text-xs text-gray-400">Where do your guests come from?</p></div>
                                {analytics.channelStats.data.length > 0 ? (<SimpleBarChart data={analytics.channelStats.data} labels={analytics.channelStats.labels} />) : (<div className="flex-1 flex flex-col items-center justify-center text-gray-300"><Globe size={48} className="mb-2 opacity-20" /><p className="text-sm italic">No channel data available</p></div>)}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: BOOKINGS LIST --- */}
                {activeTab === 'bookings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-end mb-8">
                            <div><h1 className="text-4xl font-serif font-bold text-keenan-dark">All Bookings</h1><p className="text-gray-400 text-sm mt-1">Monitoring pesanan masuk dari semua cabang hotel.</p></div>
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
                                <Filter size={16} className="text-gray-400 ml-2" />
                                <select className="bg-transparent font-bold text-sm text-keenan-dark outline-none cursor-pointer pr-4" value={selectedPropertyFilter} onChange={(e) => setSelectedPropertyFilter(e.target.value)}>
                                    <option value="all">All Properties</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
                                    <tr><th className="p-4 pl-6">Booking Ref</th><th className="p-4">Guest Name</th><th className="p-4">Hotel & Room</th><th className="p-4">Check-In / Out</th><th className="p-4">Status</th><th className="p-4 text-right pr-6">Total Price</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rawBookings
                                        .filter(b => selectedPropertyFilter === 'all' || b.property?.id === selectedPropertyFilter)
                                        .map((booking) => (
                                            <tr key={booking.id} onClick={() => openModal('booking_detail', booking)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                                <td className="p-4 pl-6"><span className="font-mono font-bold text-keenan-gold group-hover:underline">{booking.booking_code || '-'}</span><div className="text-[10px] text-gray-400 mt-1">{new Date(booking.created_at).toLocaleDateString()}</div></td>
                                                <td className="p-4"><p className="font-bold text-gray-700">{booking.customer_name || 'Guest'}</p><p className="text-xs text-gray-400">{booking.customer_phone || '-'}</p></td>
                                                <td className="p-4"><p className="font-bold text-keenan-dark text-xs">{booking.property?.name}</p><p className="text-xs text-gray-500">{booking.room_type?.name}</p></td>
                                                <td className="p-4"><div className="flex items-center gap-2 text-xs font-medium text-gray-600"><Calendar size={14} className="text-gray-300" />{formatDate(booking.check_in_date)}</div><div className="flex items-center gap-2 text-xs font-medium text-gray-600 mt-1"><span className="w-3.5"></span>{formatDate(booking.check_out_date)}</div></td>
                                                <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${booking.status === 'paid' || booking.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-200' : booking.status === 'checked_in' ? 'bg-blue-50 text-blue-600 border-blue-200' : booking.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}`}>{booking.status || 'Pending'}</span></td>
                                                <td className="p-4 pr-6 text-right font-bold text-gray-700">{formatRupiah(booking.total_price)}</td>
                                            </tr>
                                        ))}
                                    {rawBookings.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">No bookings found.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: MANAGE PROPERTIES --- */}
                {activeTab === 'properties' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-serif font-bold text-keenan-dark">Manage Properties</h2><button onClick={() => openModal('property')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add New Properties</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {properties.map(prop => (
                                <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col h-full">
                                    <div className="h-40 bg-gray-200 relative"><img src={prop.image_url} className="w-full h-full object-cover" alt={prop.name} /></div>
                                    <div className="p-6 flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-lg text-keenan-dark mb-1">{prop.name}</h3><p className="text-sm text-gray-500 mb-4 truncate">{prop.address}</p></div><div className="flex justify-end gap-2 pt-4 border-t border-gray-100"><button onClick={() => openModal('property', prop)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button><button onClick={() => handleDelete('property', prop.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 4: MANAGE ROOMS --- */}
                {activeTab === 'rooms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Rooms & Pricing</h2>
                            <button onClick={() => openModal('room')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add Room Type</button>
                        </div>
                        {properties.map(prop => {
                            const hotelRooms = rooms.filter(r => r.property_id === prop.id);
                            if (hotelRooms.length === 0) return null;
                            return (
                                <div key={prop.id} className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Hotel size={18} /> {prop.name}</h3>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold"><tr><th className="p-4 pl-6">Room Name</th><th className="p-4">Capacity</th><th className="p-4">Stock</th><th className="p-4">Price (Daily)</th><th className="p-4 text-right pr-6">Actions</th></tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {hotelRooms.map(room => (
                                                    <tr key={room.id} className="hover:bg-gray-50"><td className="p-4 pl-6 font-bold text-keenan-dark">{room.name}</td><td className="p-4 text-gray-500">{room.capacity} Person</td><td className="p-4 text-blue-600 font-bold">{room.total_stock} Unit</td><td className="p-4 font-bold text-keenan-dark">{formatRupiah(room.price_daily || room.base_price)}</td><td className="p-4 pr-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => openModal('room', room)} className="text-blue-400 hover:text-blue-600 p-2"><Edit size={18} /></button><button onClick={() => handleDelete('room', room.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button></div></td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- TAB 5: MANAGE STAFF --- */}
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Staff Access Control</h2>
                            <button onClick={() => openModal('staff')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add New Staff</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">{admin.full_name.charAt(0)}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('staff', admin)} className="text-gray-300 hover:text-blue-500"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete('staff', admin.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <div><h3 className="font-bold text-lg text-keenan-dark">{admin.full_name}</h3><p className="text-sm text-gray-400">{admin.email}</p></div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center"><span className="text-[10px] font-bold text-gray-400 uppercase">Assigned To</span><span className="text-xs font-bold text-keenan-gold bg-keenan-gold/10 px-2 py-1 rounded">{admin.scope === 'all' ? 'All Branches' : admin.scope}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 6: MANAGE PLATFORMS --- */}
                {activeTab === 'platforms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Booking Platforms</h2>
                            <button onClick={() => openModal('platform')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add Platform</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {platforms.map(plat => (
                                <div key={plat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <Globe size={18} className="text-gray-400" />
                                        <span className="font-bold text-gray-700">{plat.name}</span>
                                    </div>
                                    <button onClick={() => handleDelete('platform', plat.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* MODAL WRAPPER UNTUK DETAIL BOOKING & FORM */}
                    <div className={`bg-white w-full ${modalType === 'booking_detail' ? 'max-w-4xl bg-gray-50' : 'max-w-lg'} rounded-3xl p-0 max-h-[95vh] overflow-y-auto shadow-2xl relative transition-all duration-300`}>

                        {/* --- CLOSE BUTTON --- */}
                        <button onClick={closeModal} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/50 backdrop-blur hover:bg-white rounded-full transition-all text-gray-500 hover:text-gray-800"><X size={18} /></button>

                        {/* --- CASE 1: DETAIL BOOKING (READ ONLY) --- */}
                        {modalType === 'booking_detail' && formData && (
                            <div className="flex flex-col md:flex-row h-full">
                                {/* KIRI: USER PROFILE */}
                                <div className="md:w-1/3 bg-white p-8 flex flex-col items-center justify-center border-r border-gray-100 text-center relative overflow-hidden">
                                    <div className="w-24 h-24 bg-keenan-dark text-keenan-gold text-4xl font-serif font-bold rounded-full flex items-center justify-center mb-4 shadow-xl z-10 border-4 border-white">
                                        {formData.customer_name?.charAt(0)}
                                    </div>
                                    <h3 className="text-xl font-bold text-keenan-dark z-10">{formData.customer_name}</h3>
                                    <span className="mt-2 px-3 py-1 bg-keenan-gold/10 text-keenan-gold text-[10px] font-bold tracking-widest uppercase rounded-full z-10 border border-keenan-gold/20">
                                        {formData.booking_source}
                                    </span>

                                    <div className="w-full mt-8 space-y-4 text-left z-10">
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm"><Phone size={14} /></div>
                                            <span className="text-sm font-bold text-gray-600">{formData.customer_phone}</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm"><Mail size={14} /></div>
                                            <span className="text-xs font-bold text-gray-600 truncate">{formData.customer_email}</span>
                                        </div>
                                    </div>

                                    {/* Hiasan Background */}
                                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent"></div>
                                </div>

                                {/* KANAN: BOOKING DETAIL */}
                                <div className="md:w-2/3 p-8 bg-[#F9FAFB]">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Booking ID</p>
                                            <h2 className="text-lg font-mono font-bold text-keenan-dark">{formData.booking_code}</h2>
                                            <p className="text-[10px] text-gray-400">{new Date(formData.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${formData.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {formData.status === 'paid' && <CheckCircle size={12} />}
                                            {formData.status}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-12 h-12 bg-keenan-gold/10 rounded-xl flex items-center justify-center text-keenan-gold shrink-0"><MapPin /></div>
                                            <div>
                                                <h4 className="font-bold text-keenan-dark text-lg">{formData.property?.name}</h4>
                                                <p className="text-sm text-gray-500">{formData.room_type?.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-In</p>
                                                <p className="font-bold text-sm text-gray-700">{formatDate(formData.check_in_date)}</p>
                                            </div>
                                            <div className="text-gray-300">➜</div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-Out</p>
                                                <p className="font-bold text-sm text-gray-700">{formatDate(formData.check_out_date)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-2 text-gray-500 text-sm font-bold"><CreditCard size={16} /> Total Paid</div>
                                        <div className="text-2xl font-bold text-keenan-gold">{formatRupiah(formData.total_price)}</div>
                                    </div>

                                    {formData.customer_notes && (
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 mb-6">
                                            <span className="font-bold block mb-1 text-[10px] uppercase text-yellow-600">Guest Notes:</span>
                                            "{formData.customer_notes}"
                                        </div>
                                    )}

                                    <button onClick={() => window.print()} className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                        <Printer size={18} /> Print Booking Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- CASE 2: EDIT FORM (PROPERTY/ROOM/STAFF/PLATFORM) --- */}
                        {modalType !== 'booking_detail' && (
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl font-serif capitalize">{editingId ? 'Edit' : 'Add New'} {modalType}</h3></div>

                                {modalType === 'property' && (
                                    <div className="space-y-4">
                                        <input placeholder="Hotel Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <input placeholder="Address" value={formData.address || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, address: e.target.value })} />

                                        {/* PERUBAHAN: FILE UPLOAD LOKAL UNTUK PROPERTY */}
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-3">
                                                <UploadCloud size={16} className="text-keenan-gold" /> Upload Property Image
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-keenan-gold/10 file:text-keenan-dark hover:file:bg-keenan-gold/20 cursor-pointer"
                                            />
                                            {(formData.preview_url || formData.image_url) && (
                                                <div className="mt-4 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                                    <img src={formData.preview_url || formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        <textarea placeholder="Description" value={formData.description || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        <button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE PROPERTY"}</button>
                                    </div>
                                )}

                                {modalType === 'room' && (
                                    <div className="space-y-4">
                                        <select className="w-full p-3 border rounded-lg bg-white" value={formData.property_id || ''} onChange={e => setFormData({ ...formData, property_id: e.target.value })}>
                                            <option>Select Property</option>
                                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <input placeholder="Room Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} />

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-3"><label className="text-xs font-bold text-gray-400 uppercase">Pricing Options</label></div>
                                            <div><input type="number" placeholder="Daily Price" value={formData.price_daily || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, price_daily: e.target.value })} /></div>
                                            <div><input type="number" placeholder="Weekly Price" value={formData.price_weekly || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, price_weekly: e.target.value })} /></div>
                                            <div><input type="number" placeholder="Monthly Price" value={formData.price_monthly || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, price_monthly: e.target.value })} /></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div><input type="number" placeholder="Capacity" value={formData.capacity || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, capacity: e.target.value })} /></div>
                                            <div><input type="number" placeholder="Total Stock" value={formData.total_stock || ''} className="w-full p-3 border rounded-lg font-bold" onChange={e => setFormData({ ...formData, total_stock: e.target.value })} /></div>
                                        </div>

                                        {/* PERUBAHAN: FILE UPLOAD LOKAL UNTUK ROOM */}
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-3">
                                                <UploadCloud size={16} className="text-keenan-gold" /> Upload Room Image
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-keenan-gold/10 file:text-keenan-dark hover:file:bg-keenan-gold/20 cursor-pointer"
                                            />
                                            {(formData.preview_url || formData.image_url) && (
                                                <div className="mt-4 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                                    <img src={formData.preview_url || formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {facilityOptions.map(fac => (
                                                <label key={fac} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={selectedFacilities.includes(fac)} onChange={() => handleFacilityChange(fac)} className="accent-keenan-gold" /> {fac}</label>
                                            ))}
                                        </div>
                                        <button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE ROOM"}</button>
                                    </div>
                                )}

                                {modalType === 'staff' && (
                                    <div className="space-y-4">
                                        <input placeholder="Full Name" value={formData.full_name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                                        <input placeholder="Email" type="email" value={formData.email || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <input placeholder="Password (Isi jika ingin mengubah)" type="password" value={formData.password || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                        <select className="w-full p-3 border rounded-lg bg-white" value={formData.scope || ''} onChange={e => setFormData({ ...formData, scope: e.target.value })}>
                                            <option value="">-- Assign to Branch --</option>
                                            {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </select>
                                        <button onClick={handleSave} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold">{editingId ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}</button>
                                    </div>
                                )}

                                {modalType === 'platform' && (
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-gray-500">Platform Name</label>
                                        <input placeholder="Ex: Traveloka, Agoda, Tiket.com" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <button onClick={handleSave} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold">ADD PLATFORM</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}