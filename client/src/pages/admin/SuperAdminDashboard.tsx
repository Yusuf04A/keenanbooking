import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Hotel, BedDouble, Users,
    Plus, Trash2, Edit, X, Loader2, ShieldCheck, UploadCloud,
    TrendingUp, Wallet, UserCheck, Filter, Globe
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
    const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'rooms' | 'staff'>('overview');

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);

    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [admins, setAdmins] = useState<any[]>([]);

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
    const [modalType, setModalType] = useState<'property' | 'room' | 'staff' | ''>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const facilityOptions = ["Wifi", "AC", "Breakfast", "TV", "Netflix", "Hot Water", "Parking", "Kitchen"];
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

    useEffect(() => {
        const checkUserRole = () => {
            const role = localStorage.getItem('keenan_admin_role');
            if (role !== 'superadmin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                setCheckingRole(false);
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
            const { data: props } = await supabase.from('properties').select('*');
            const { data: roomData } = await supabase.from('room_types').select('*, properties(name)').order('property_id');
            const { data: staff } = await supabase.from('admins').select('*').neq('role', 'superadmin');

            const { data: bookingData } = await supabase
                .from('bookings')
                .select(`id, total_price, check_in_date, booking_source, status, properties ( id, name )`)
                .in('status', ['paid', 'checked_in', 'checked_out']);

            setProperties(props || []);
            setRooms(roomData || []);
            setAdmins(staff || []);
            setRawBookings(bookingData || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = () => {
        const filteredBookings = rawBookings.filter(b =>
            selectedPropertyFilter === 'all' || b.properties?.id === selectedPropertyFilter
        );

        const totalRevenue = filteredBookings.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
        const totalBookings = filteredBookings.length;

        const months = new Array(12).fill(0);
        filteredBookings.forEach(b => {
            if (b.check_in_date) {
                const date = new Date(b.check_in_date);
                if (!isNaN(date.getTime())) months[date.getMonth()] += (b.total_price || 0);
            }
        });

        const channels: Record<string, number> = {};
        filteredBookings.forEach(b => {
            const source = (b.booking_source || 'Website').toLowerCase();
            channels[source] = (channels[source] || 0) + 1;
        });

        if (Object.keys(channels).length === 0) {
            // channels['No Data'] = 0; 
        }

        const channelLabels = Object.keys(channels);
        const channelData = Object.values(channels);

        const propPerformance: Record<string, number> = {};
        rawBookings.forEach(b => {
            const pName = b.properties?.name || 'Unknown';
            propPerformance[pName] = (propPerformance[pName] || 0) + (b.total_price || 0);
        });
        const sortedProps = Object.entries(propPerformance)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        setAnalytics({
            totalRevenue,
            totalBookings,
            monthlyRevenue: months,
            channelStats: { labels: channelLabels, data: channelData },
            topProperties: sortedProps
        });
    };

    const formatRupiah = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    const uploadImage = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${modalType}/${fileName}`;
        const { error } = await supabase.storage.from('property-images').upload(filePath, file);
        if (error) throw error;
        const { data } = supabase.storage.from('property-images').getPublicUrl(filePath);
        return data.publicUrl;
    };
    const createSlug = (name: string) => name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const handleSave = async () => {
        setUploading(true);
        try {
            let imageUrl = formData.image_url;
            if (imageFile) imageUrl = await uploadImage(imageFile);

            if (modalType === 'property') {
                const payload = { name: formData.name, address: formData.address, description: formData.description, image_url: imageUrl, slug: createSlug(formData.name) };
                if (editingId) await supabase.from('properties').update(payload).eq('id', editingId);
                else await supabase.from('properties').insert([payload]);
            }
            if (modalType === 'room') {
                const payload = { property_id: formData.property_id, name: formData.name, description: formData.description, base_price: parseInt(formData.base_price), capacity: parseInt(formData.capacity), total_stock: parseInt(formData.total_stock || '1'), image_url: imageUrl, facilities: selectedFacilities };
                if (editingId) await supabase.from('room_types').update(payload).eq('id', editingId);
                else await supabase.from('room_types').insert([payload]);
            }
            if (modalType === 'staff') {
                const payload = { email: formData.email, password: formData.password, full_name: formData.full_name, role: 'admin', scope: formData.scope };
                if (editingId) await supabase.from('admins').update(payload).eq('id', editingId);
                else await supabase.from('admins').insert([payload]);
            }
            alert("Success!"); closeModal(); fetchAllData();
        } catch (error: any) { alert("Error: " + error.message); } finally { setUploading(false); }
    };

    const handleDelete = async (table: string, id: string) => {
        if (!confirm("Delete?")) return;
        await supabase.from(table).delete().eq('id', id);
        fetchAllData();
    }

    const openModal = (type: any, data: any = null) => {
        setModalType(type); setEditingId(data?.id); setImageFile(null);
        setFormData(data || {}); setSelectedFacilities(data?.facilities || []);
        setIsModalOpen(true);
    }
    const closeModal = () => { setIsModalOpen(false); setModalType(''); }
    const handleFacilityChange = (fac: string) => {
        if (selectedFacilities.includes(fac)) setSelectedFacilities(selectedFacilities.filter(f => f !== fac));
        else setSelectedFacilities([...selectedFacilities, fac]);
    }
    const handleLogout = () => { localStorage.removeItem('keenan_admin_token'); navigate('/admin/login'); };

    if (checkingRole || loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-keenan-gold" /></div>;

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
                    <button onClick={() => setActiveTab('properties')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'properties' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Hotel size={18} /> Properties</button>
                    <button onClick={() => setActiveTab('rooms')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'rooms' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><BedDouble size={18} /> Rooms</button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Users size={18} /> Staff</button>
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

                        {selectedPropertyFilter === 'all' && (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-8 border-b border-gray-100"><h3 className="font-bold text-lg text-keenan-dark">🏆 Top Performing Properties</h3></div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold"><tr><th className="p-6">Rank</th><th className="p-6">Property Name</th><th className="p-6 text-right">Total Revenue</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {analytics.topProperties.map(([name, revenue], index) => (
                                            <tr key={name} className="hover:bg-gray-50"><td className="p-6 font-bold text-keenan-gold">#{index + 1}</td><td className="p-6 font-bold text-keenan-dark">{name}</td><td className="p-6 text-right font-mono font-bold text-green-600">{formatRupiah(revenue)}</td></tr>
                                        ))}
                                        {analytics.topProperties.length === 0 && (<tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">No revenue data available.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 2: MANAGE PROPERTIES --- */}
                {activeTab === 'properties' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-serif font-bold text-keenan-dark">Manage Properties</h2><button onClick={() => openModal('property')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add New Hotel</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {properties.map(prop => (
                                <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col h-full">
                                    <div className="h-40 bg-gray-200 relative"><img src={prop.image_url} className="w-full h-full object-cover" alt={prop.name} /></div>
                                    <div className="p-6 flex-1 flex flex-col justify-between"><div><h3 className="font-bold text-lg text-keenan-dark mb-1">{prop.name}</h3><p className="text-sm text-gray-500 mb-4 truncate">{prop.address}</p></div><div className="flex justify-end gap-2 pt-4 border-t border-gray-100"><button onClick={() => openModal('property', prop)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button><button onClick={() => handleDelete('properties', prop.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 3: MANAGE ROOMS (INI YANG KEMARIN HILANG) --- */}
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
                                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
                                                <tr>
                                                    <th className="p-4 pl-6">Room Name</th>
                                                    <th className="p-4">Capacity</th>
                                                    <th className="p-4">Stock</th>
                                                    <th className="p-4">Base Price</th>
                                                    <th className="p-4 text-right pr-6">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {hotelRooms.map(room => (
                                                    <tr key={room.id} className="hover:bg-gray-50">
                                                        <td className="p-4 pl-6 font-bold text-keenan-dark">{room.name}</td>
                                                        <td className="p-4 text-gray-500">{room.capacity} Person</td>
                                                        <td className="p-4 text-blue-600 font-bold">{room.total_stock} Unit</td>
                                                        <td className="p-4 font-bold text-keenan-dark">{formatRupiah(room.base_price)}</td>
                                                        <td className="p-4 pr-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => openModal('room', room)} className="text-blue-400 hover:text-blue-600 p-2"><Edit size={18} /></button>
                                                                <button onClick={() => handleDelete('room_types', room.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- TAB 4: MANAGE STAFF (INI JUGA KEMARIN HILANG) --- */}
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
                                            <button onClick={() => handleDelete('admins', admin.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-keenan-dark">{admin.full_name}</h3>
                                        <p className="text-sm text-gray-400">{admin.email}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Assigned To</span>
                                        <span className="text-xs font-bold text-keenan-gold bg-keenan-gold/10 px-2 py-1 rounded">{admin.scope === 'all' ? 'All Branches' : admin.scope}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl font-serif capitalize">{editingId ? 'Edit' : 'Add New'} {modalType}</h3><button onClick={closeModal}><X /></button></div>
                        {modalType === 'property' && (<div className="space-y-4"><input placeholder="Hotel Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} /><input placeholder="Address" value={formData.address || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, address: e.target.value })} /><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-keenan-gold transition-colors"><input type="file" id="propImg" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} /><label htmlFor="propImg" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500"><UploadCloud size={24} /><span className="text-sm font-bold">{imageFile ? imageFile.name : (formData.image_url ? "Change Image" : "Upload Image")}</span></label></div><textarea placeholder="Description" value={formData.description || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, description: e.target.value })} /><button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE PROPERTY"}</button></div>)}
                        {modalType === 'room' && (<div className="space-y-4"><select className="w-full p-3 border rounded-lg bg-white" value={formData.property_id || ''} onChange={e => setFormData({ ...formData, property_id: e.target.value })}><option>Select Property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input placeholder="Room Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} /><div className="grid grid-cols-3 gap-4"><div className="col-span-2"><input type="number" placeholder="Price (Rp)" value={formData.base_price || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, base_price: e.target.value })} /></div><div><input type="number" placeholder="Cap" value={formData.capacity || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, capacity: e.target.value })} /></div></div><div><input type="number" placeholder="Total Room Stock" value={formData.total_stock || ''} className="w-full p-3 border rounded-lg font-bold" onChange={e => setFormData({ ...formData, total_stock: e.target.value })} /></div><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-keenan-gold transition-colors"><input type="file" id="roomImg" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} /><label htmlFor="roomImg" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500"><UploadCloud size={24} /><span className="text-sm font-bold">{imageFile ? imageFile.name : (formData.image_url ? "Change Image" : "Upload Image")}</span></label></div><div className="grid grid-cols-2 gap-2">{facilityOptions.map(fac => (<label key={fac} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={selectedFacilities.includes(fac)} onChange={() => handleFacilityChange(fac)} className="accent-keenan-gold" /> {fac}</label>))}</div><button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE ROOM"}</button></div>)}
                        {modalType === 'staff' && (<div className="space-y-4"><input placeholder="Full Name" value={formData.full_name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, full_name: e.target.value })} /><input placeholder="Email" type="email" value={formData.email || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, email: e.target.value })} /><input placeholder="Password" type="password" value={formData.password || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, password: e.target.value })} /><select className="w-full p-3 border rounded-lg bg-white" value={formData.scope || ''} onChange={e => setFormData({ ...formData, scope: e.target.value })}><option value="">-- Assign to Branch --</option>{properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select><button onClick={handleSave} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold">{editingId ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}</button></div>)}
                    </div>
                </div>
            )}
        </div>
    );
}