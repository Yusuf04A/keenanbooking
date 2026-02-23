import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { sendWhatsAppInvoice } from '../../lib/fonnte';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import {
    LayoutDashboard, LogOut as LogOutIcon, Hotel, BedDouble, Users, BookOpen,
    Plus, Trash2, Edit, X, Loader2, ShieldCheck, UploadCloud,
    Filter, Globe, Calendar, CheckCircle, Mail, Phone, MapPin, Printer, CreditCard,
    Layers, User, MessageSquare, AlertCircle, Search, LogIn, Clock, XCircle, Smartphone
} from 'lucide-react';

// --- COMPONENT: DONUT CHART ---
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

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'bookings' | 'properties' | 'rooms' | 'staff' | 'platforms'>('overview');

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [removedGalleryIndices, setRemovedGalleryIndices] = useState<number[]>([]);

    // Filter & Search
    const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('all');
    const [bookingFilter, setBookingFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // User State
    const [adminName, setAdminName] = useState('Super Admin');

    // Data States
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [admins, setAdmins] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);

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

    // --- CALENDAR & MANUAL BOOKING STATES ---
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityMsg, setAvailabilityMsg] = useState('');
    const [newBooking, setNewBooking] = useState({
        customer_name: '', customer_email: '', customer_phone: '',
        room_type_id: '', check_in_date: '', check_out_date: '',
        total_price: 0, notes: '', booking_source: ''
    });

    // Modal Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'property' | 'room' | 'staff' | 'booking_detail' | 'platform' | 'manual_booking' | ''>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

    const facilityOptions = ["Wifi", "AC", "Breakfast", "TV", "Netflix", "Hot Water", "Parking", "Kitchen"];

    useEffect(() => {
        const checkUserRole = () => {
            const role = localStorage.getItem('keenan_admin_role');
            const name = localStorage.getItem('keenan_admin_name') || 'Super Admin';
            if (role !== 'superadmin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                setAdminName(name);
                fetchAllData();
            }
        };
        checkUserRole();
    }, [navigate]);

    useEffect(() => {
        if (!loading) {
            calculateAnalytics();
            formatCalendarEvents();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPropertyFilter, rawBookings]);

    useEffect(() => {
        if (newBooking.room_type_id && newBooking.check_in_date && newBooking.check_out_date) {
            checkAvailability();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newBooking.room_type_id, newBooking.check_in_date, newBooking.check_out_date]);

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
            if (error.response?.status === 401) navigate('/admin/login');
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = () => {
        let tRev = 0, cCount = 0, pRev = 0;
        let statusCounts = { paid: 0, confirmed: 0, pending: 0, checked_in: 0, checked_out: 0, cancelled: 0 };
        let venueRev: Record<string, number> = {};
        let channelCount: Record<string, number> = {};

        const currentMonth = new Date().getMonth();
        let mTrend = new Array(6).fill(0);

        const filteredBookings = rawBookings.filter(b => selectedPropertyFilter === 'all' || b.property?.id === selectedPropertyFilter);

        filteredBookings.forEach(b => {
            const price = Number(b.total_price) || 0;
            const status = b.status?.toLowerCase() || 'pending';
            const source = b.booking_source?.toLowerCase() || 'website';
            const venue = b.property?.name || 'Unknown';

            statusCounts[status as keyof typeof statusCounts] = (statusCounts[status as keyof typeof statusCounts] || 0) + 1;

            if (['paid', 'confirmed', 'checked_in', 'checked_out'].includes(status)) {
                tRev += price; cCount++;
                venueRev[venue] = (venueRev[venue] || 0) + price;

                if (b.check_in_date) {
                    const bMonth = new Date(b.check_in_date).getMonth();
                    let diff = currentMonth - bMonth;
                    if (diff < 0) diff += 12;
                    if (diff < 6) mTrend[5 - diff] += price;
                }
            } else if (status === 'pending') {
                pRev += price;
            }

            if (status !== 'cancelled') channelCount[source] = (channelCount[source] || 0) + 1;
        });

        const sDist = [
            { label: 'Paid/Conf', value: statusCounts.paid + statusCounts.confirmed, color: '#F59E0B' },
            { label: 'Pending', value: statusCounts.pending, color: '#3B82F6' },
            { label: 'Checked In', value: statusCounts.checked_in, color: '#10B981' },
            { label: 'Cancelled', value: statusCounts.cancelled, color: '#EF4444' },
        ].filter(item => item.value > 0);

        const vRevFormatted = Object.entries(venueRev).map(([name, rev]) => ({ name, rev })).sort((a, b) => b.rev - a.rev).slice(0, 5);
        const cDistFormatted = Object.entries(channelCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

        setStats({
            totalRevenue: tRev, confirmedCount: cCount, pendingRevenue: pRev, averageBooking: cCount > 0 ? tRev / cCount : 0,
            statusDist: sDist, monthlyTrend: mTrend, venueRevenue: vRevFormatted, channelDist: cDistFormatted
        });
    };

    const formatCalendarEvents = () => {
        const validBookings = rawBookings.filter(b => selectedPropertyFilter === 'all' || b.property?.id === selectedPropertyFilter);
        const formattedEvents = validBookings.map((booking: any) => {
            let bgColor = '#C5A059';
            switch (booking.status) {
                case 'checked_in': bgColor = '#2563EB'; break;
                case 'checked_out': bgColor = '#EF4444'; break;
                case 'cancelled': bgColor = '#94A3B8'; break;
                case 'pending': bgColor = '#F59E0B'; break;
                default: bgColor = '#C5A059';
            }
            return {
                id: booking.id, title: `${booking.customer_name} (${booking.room_type?.name})`,
                start: booking.check_in_date, end: booking.check_out_date,
                backgroundColor: bgColor, borderColor: 'transparent', textColor: '#ffffff',
                extendedProps: { status: booking.status, guest: booking.customer_name, room: booking.room_type?.name, room_id: booking.room_type_id }
            };
        });
        setCalendarEvents(formattedEvents);
    };

    const formatRupiah = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);

    const getMonthLabels = () => {
        const labels = [];
        const d = new Date();
        for (let i = 5; i >= 0; i--) {
            const pastD = new Date(d.getFullYear(), d.getMonth() - i, 1);
            labels.push(pastD.toLocaleDateString('en-US', { month: 'short' }));
        }
        return labels;
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': case 'confirmed': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> PAID / CONFIRMED</span>;
            case 'checked_in': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><LogIn size={12} /> CHECKED IN</span>;
            case 'checked_out': return <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><LogOutIcon size={12} /> CHECKED OUT</span>;
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><Clock size={12} /> PENDING</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> CANCELLED</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-[10px] font-bold">{status}</span>;
        }
    };

    const getSourceBadge = (source: string = 'website') => {
        const s = source?.toLowerCase() || 'website';
        if (s.includes('agoda')) return <span className="text-[9px] font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> AGODA</span>;
        if (s.includes('traveloka')) return <span className="text-[9px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TRAVELOKA</span>;
        if (s.includes('tiket')) return <span className="text-[9px] font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded border border-yellow-200 flex items-center gap-1 w-fit"><Smartphone size={10} /> TIKET.COM</span>;
        if (s === 'walk_in' || s.includes('walk')) return <span className="text-[9px] font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 flex items-center gap-1 w-fit"><User size={10} /> WALK-IN</span>;
        return <span className="text-[9px] font-bold px-2 py-1 bg-keenan-gold/10 text-keenan-gold rounded border border-keenan-gold/20 flex items-center gap-1 w-fit uppercase"><Globe size={10} /> {s.replace(/[-_]/g, ' ')}</span>;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({ ...formData, image_file: file, preview_url: URL.createObjectURL(file) });
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        const newPreviews = newFiles.map(f => URL.createObjectURL(f));
        setGalleryFiles(prev => [...prev, ...newFiles]);
        setGalleryPreviews(prev => [...prev, ...newPreviews]);
    };

    const handleRemoveNewGallery = (idx: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== idx));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const handleRemoveExistingGallery = (idx: number) => {
        setRemovedGalleryIndices(prev => [...prev, idx]);
    };

    const checkAvailability = async () => {
        setIsChecking(true);
        setAvailabilityMsg('');
        try {
            const startDate = new Date(newBooking.check_in_date);
            const endDate = new Date(newBooking.check_out_date);
            const conflict = calendarEvents.find(event => {
                if (event.extendedProps.room_id !== newBooking.room_type_id) return false;
                if (event.extendedProps.status === 'cancelled') return false;
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                return (startDate < eventEnd && endDate > eventStart);
            });
            if (conflict) setAvailabilityMsg('⚠️ TERISI: Kamar ini sudah ada yang pesan di tanggal tersebut!');
            else setAvailabilityMsg('✅ Kamar Tersedia');
        } catch (error) { console.error(error); } finally { setIsChecking(false); }
    };

    const handleRoomChange = (roomId: string) => {
        const selectedRoom = rooms.find(r => r.id === roomId);
        if (selectedRoom) setNewBooking({ ...newBooking, room_type_id: roomId, total_price: Number(selectedRoom.price_daily || selectedRoom.base_price) });
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (availabilityMsg.includes('TERISI') && !confirm("Kamar ini terisi! Yakin mau Overbooking?")) return;
        const selectedRoom = rooms.find(r => r.id === newBooking.room_type_id);
        if (!selectedRoom) return alert("Pilih tipe kamar!");

        try {
            const res = await api.post('/midtrans/create-transaction', {
                property_id: selectedRoom.property_id, room_type_id: newBooking.room_type_id,
                customer_name: newBooking.customer_name, customer_email: newBooking.customer_email || 'manual@admin.com',
                customer_phone: newBooking.customer_phone || '-', check_in_date: newBooking.check_in_date,
                check_out_date: newBooking.check_out_date, total_price: newBooking.total_price,
                customer_notes: newBooking.notes, booking_source: newBooking.booking_source,
            });
            const bookingData = res.data.booking;
            await api.put(`/admin/bookings/${bookingData.id}/status`, { status: 'paid' });
            await sendWhatsAppInvoice(
                newBooking.customer_phone, newBooking.customer_name, bookingData.booking_code,
                selectedRoom.property?.name || 'Keenan Living', selectedRoom.name,
                newBooking.check_in_date, newBooking.check_out_date, newBooking.total_price, ""
            );
            alert("✅ Manual Booking Berhasil & Notifikasi Terkirim!");
            closeModal();
            fetchAllData();
        } catch (error: any) { alert("Gagal simpan: " + (error.response?.data?.message || error.message)); }
    };

    const handleSave = async () => {
        setUploading(true);
        try {
            if (modalType === 'property') {
                const submitData = new FormData();
                submitData.append('name', formData.name || ''); submitData.append('address', formData.address || ''); submitData.append('description', formData.description || '');
                if (formData.image_file) submitData.append('image', formData.image_file);
                // Kirim gallery files baru
                galleryFiles.forEach(file => submitData.append('images[]', file));
                // Kirim index gallery yang dihapus (satu per satu secara berurutan, sudah dihandle di backend)
                if (editingId && removedGalleryIndices.length > 0) {
                    // Sort descending agar penghapusan index tidak geser index berikutnya
                    const sortedIndices = [...removedGalleryIndices].sort((a, b) => b - a);
                    for (const idx of sortedIndices) {
                        const tempData = new FormData();
                        tempData.append('name', formData.name || ''); tempData.append('address', formData.address || ''); tempData.append('description', formData.description || '');
                        tempData.append('remove_gallery_index', String(idx));
                        tempData.append('_method', 'PUT');
                        await api.post(`/admin/properties/${editingId}`, tempData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    }
                    // Setelah hapus, upload gambar baru
                    if (galleryFiles.length > 0 || formData.image_file) {
                        const finalData = new FormData();
                        finalData.append('name', formData.name || ''); finalData.append('address', formData.address || ''); finalData.append('description', formData.description || '');
                        if (formData.image_file) finalData.append('image', formData.image_file);
                        galleryFiles.forEach(file => finalData.append('images[]', file));
                        finalData.append('_method', 'PUT');
                        await api.post(`/admin/properties/${editingId}`, finalData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    }
                } else if (editingId) {
                    submitData.append('_method', 'PUT'); await api.post(`/admin/properties/${editingId}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                } else {
                    await api.post('/admin/properties', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
            }

            if (modalType === 'room') {
                const submitData = new FormData();
                submitData.append('property_id', formData.property_id || ''); submitData.append('name', formData.name || '');
                submitData.append('price_daily', formData.price_daily || ''); submitData.append('price_weekly', formData.price_weekly || ''); submitData.append('price_monthly', formData.price_monthly || '');
                submitData.append('capacity', formData.capacity || ''); submitData.append('total_stock', formData.total_stock || '');
                selectedFacilities.forEach((fac, index) => submitData.append(`facilities[${index}]`, fac));
                if (formData.image_file) submitData.append('image', formData.image_file);

                if (editingId) { submitData.append('_method', 'PUT'); await api.post(`/admin/rooms/${editingId}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } }); }
                else await api.post('/admin/rooms', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            if (modalType === 'staff') {
                const payload = { ...formData };
                if (editingId) await api.put(`/admin/staff/${editingId}`, payload);
                else await api.post('/admin/staff', payload);
            }

            if (modalType === 'platform') await api.post('/admin/platforms', { name: formData.name });

            alert("Data Berhasil Disimpan!");
            closeModal();
            fetchAllData();
        } catch (error: any) { alert("Gagal menyimpan: " + (error.response?.data?.message || error.message)); } finally { setUploading(false); }
    };

    const handleDelete = async (type: 'property' | 'room' | 'staff' | 'platform', id: string) => {
        if (!confirm("Are you sure you want to delete this data?")) return;
        try {
            if (type === 'property') await api.delete(`/admin/properties/${id}`);
            if (type === 'room') await api.delete(`/admin/rooms/${id}`);
            if (type === 'staff') await api.delete(`/admin/staff/${id}`);
            if (type === 'platform') await api.delete(`/admin/platforms/${id}`);
            fetchAllData();
        } catch (error) { alert("Gagal menghapus data."); }
    }

    const openModal = (type: any, data: any = null) => {
        setModalType(type); setEditingId(data?.id);
        setFormData({ ...data, image_file: null, preview_url: null } || {});
        setSelectedFacilities(data?.facilities || []);
        // Reset gallery state
        setGalleryFiles([]);
        setGalleryPreviews([]);
        setRemovedGalleryIndices([]);

        if (type === 'manual_booking') {
            setNewBooking({
                customer_name: '', customer_email: '', customer_phone: '', room_type_id: '', check_in_date: '', check_out_date: '',
                total_price: 0, notes: '', booking_source: platforms.length > 0 ? platforms[0].slug : 'walk_in'
            });
            setAvailabilityMsg('');
        }
        setIsModalOpen(true);
    }
    const closeModal = () => { setIsModalOpen(false); setModalType(''); }

    const handleFacilityChange = (fac: string) => {
        if (selectedFacilities.includes(fac)) setSelectedFacilities(selectedFacilities.filter(f => f !== fac));
        else setSelectedFacilities([...selectedFacilities, fac]);
    }

    const handleLogout = async () => { try { await api.post('/logout'); } catch (e) { } localStorage.clear(); navigate('/admin/login'); };

    const getModalSize = () => {
        if (modalType === 'booking_detail') return 'max-w-5xl bg-white';
        if (modalType === 'manual_booking') return 'max-w-3xl bg-white';
        return 'max-w-lg bg-white';
    }

    // Filter Bookings for Display
    const displayBookings = rawBookings.filter(b => {
        const matchesProp = selectedPropertyFilter === 'all' || b.property?.id === selectedPropertyFilter;
        const matchesStatus = bookingFilter === 'all' || b.status === bookingFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (b.customer_name?.toLowerCase() || '').includes(searchLower) || (b.booking_code?.toLowerCase() || '').includes(searchLower);
        return matchesProp && matchesStatus && matchesSearch;
    });

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-800">
            {/* SIDEBAR */}
            <div className="w-64 bg-keenan-dark border-r border-gray-100 p-6 hidden md:flex flex-col fixed h-full z-10 print:hidden">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-keenan-gold rounded-full flex items-center justify-center mx-auto mb-3 text-keenan-dark"><ShieldCheck size={32} /></div>
                    <h2 className="text-xl font-black text-white tracking-tight">SuperAdmin</h2>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 font-bold">Workspace</p>
                </div>
                <nav className="space-y-1">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'overview' ? 'bg-keenan-gold text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><LayoutDashboard size={18} /> Dashboard</button>
                    <button onClick={() => setActiveTab('calendar')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'calendar' ? 'bg-keenan-gold text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><Calendar size={18} /> Calendar</button>
                    <button onClick={() => setActiveTab('bookings')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'bookings' ? 'bg-keenan-gold text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><BookOpen size={18} /> Bookings</button>
                    <div className="pt-4 pb-2"><p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-3">Management</p></div>
                    <button onClick={() => setActiveTab('properties')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'properties' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><Hotel size={18} /> Properties</button>
                    <button onClick={() => setActiveTab('rooms')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'rooms' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><BedDouble size={18} /> Rooms</button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'staff' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><Users size={18} /> Staff</button>
                    <button onClick={() => setActiveTab('platforms')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'platforms' ? 'bg-white/10 text-white font-bold' : 'text-gray-500 hover:bg-white/5 font-medium'}`}><Layers size={18} /> Platforms</button>
                </nav>
                <button onClick={handleLogout} className="mt-auto flex items-center justify-center gap-2 p-3 rounded-xl text-gray-400 hover:bg-red-900/20 hover:text-red-400 font-bold text-sm transition-colors border border-transparent hover:border-red-900/50">
                    <LogOutIcon size={18} /> Logout
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-6 lg:p-8 overflow-x-hidden print:hidden">

                {/* Header (Filter & Profile) */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-8 gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 max-w-xs w-full sm:w-auto">
                        <Filter size={16} className="text-gray-400 ml-2 shrink-0" />
                        <select className="bg-transparent font-bold text-sm text-gray-800 outline-none cursor-pointer pr-4 w-full" value={selectedPropertyFilter} onChange={(e) => setSelectedPropertyFilter(e.target.value)}>
                            <option value="all">All Properties</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <p className="font-bold text-sm text-gray-900">{adminName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Global Access</p>
                        </div>
                        <div className="w-10 h-10 bg-keenan-gold/20 text-keenan-dark rounded-full flex items-center justify-center"><User size={20} /></div>
                    </div>
                </div>

                {/* --- TAB 1: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start text-gray-500 mb-2"><span className="text-xs font-semibold">Total Revenue</span></div>
                                <div><h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.totalRevenue)}</h3><p className="text-[10px] text-gray-400 mt-1">From paid bookings</p></div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start text-gray-500 mb-2"><span className="text-xs font-semibold">Confirmed Bookings</span></div>
                                <div><h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.confirmedCount}</h3><p className="text-[10px] text-gray-400 mt-1">Active confirmed bookings</p></div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start text-gray-500 mb-2"><span className="text-xs font-semibold">Pending Revenue</span></div>
                                <div><h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.pendingRevenue)}</h3><p className="text-[10px] text-gray-400 mt-1">From pending bookings</p></div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                                <div className="flex justify-between items-start text-gray-500 mb-2"><span className="text-xs font-semibold">Average Booking</span></div>
                                <div><h3 className="text-2xl font-black text-gray-900 tracking-tight">{formatRupiah(stats.averageBooking)}</h3><p className="text-[10px] text-gray-400 mt-1">Per confirmed booking</p></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                            {/* REVENUE TREND */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-1">Revenue Trend</h3>
                                <p className="text-[10px] text-gray-400 mb-6">Revenue over the last 6 months</p>
                                <div className="relative h-48 w-full flex items-end justify-between pt-4">
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                        {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-gray-100 w-full h-0"></div>)}
                                    </div>
                                    <div className="absolute inset-0 flex items-end justify-between px-2 pb-6">
                                        {stats.monthlyTrend.map((val, i) => {
                                            const max = Math.max(...stats.monthlyTrend, 1);
                                            const heightPercent = (val / max) * 100;
                                            return (
                                                <div key={i} className="flex flex-col items-center group relative h-full justify-end w-4">
                                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[9px] px-2 py-1 rounded transition-opacity z-10 whitespace-nowrap">
                                                        {formatRupiah(val)}
                                                    </div>
                                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-green-500 bg-white z-0" style={{ marginBottom: `calc(${heightPercent}% - 5px)` }}></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="absolute bottom-0 w-full flex justify-between text-[9px] text-gray-400 font-medium px-1">
                                        {getMonthLabels().map((m, i) => <span key={i}>{m}</span>)}
                                    </div>
                                </div>
                            </div>

                            {/* STATUS DIST */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-1">Booking Status</h3>
                                <p className="text-[10px] text-gray-400 mb-6">Distribution of booking statuses</p>
                                <DonutChart data={stats.statusDist} />
                            </div>

                            {/* REVENUE BY VENUE */}
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

                            {/* CHANNELS */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-1">Booking Channels</h3>
                                <p className="text-[10px] text-gray-400 mb-6">Distribution by channel source</p>
                                <div className="h-40 w-full flex items-end justify-around pb-6 border-b border-gray-100 relative">
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
                    </div>
                )}

                {/* --- TAB 2: CALENDAR --- */}
                {activeTab === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900">Reservation Calendar</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage manual bookings & check rooms availability.</p>
                            </div>
                            <button onClick={() => openModal('manual_booking')} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md text-xs uppercase tracking-widest">
                                <Plus size={16} /> MANUAL BOOKING
                            </button>
                        </div>
                        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 custom-calendar overflow-hidden">
                            <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={calendarEvents} height="auto" dayMaxEvents={true} headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }} />
                        </div>
                        <style>{`
                            .custom-calendar .fc-toolbar-title { font-weight: 900; color: #111827; font-size: 1.4rem !important; }
                            .custom-calendar .fc-button { background: #ffffff !important; border: 1px solid #e2e8f0 !important; color: #64748b !important; font-size: 0.7rem !important; font-weight: bold !important; text-transform: uppercase !important; border-radius: 8px !important; }
                            .custom-calendar .fc-button-active { background: #111827 !important; color: #ffffff !important; border-color: #111827 !important; }
                            .fc-day-today { background: rgba(59, 130, 246, 0.05) !important; }
                        `}</style>
                    </div>
                )}

                {/* --- TAB 3: BOOKINGS --- */}
                {activeTab === 'bookings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="mb-6">
                            <h1 className="text-3xl font-black text-gray-900">All Bookings</h1>
                            <p className="text-gray-500 text-sm mt-1">Monitoring pesanan masuk dari cabang hotel.</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50 rounded-t-2xl">
                                <div className="flex gap-2 overflow-x-auto">
                                    {['all', 'paid', 'checked_in', 'checked_out', 'pending'].map((stat) => (
                                        <button key={stat} onClick={() => setBookingFilter(stat)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${bookingFilter === stat ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
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
                                        <tr><th className="p-4 pl-6">Ref ID</th><th className="p-4">Guest</th><th className="p-4">Venue & Room</th><th className="p-4">Dates</th><th className="p-4">Status</th><th className="p-4 text-right pr-6">Amount</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {displayBookings.map((booking) => (
                                            <tr key={booking.id} onClick={() => openModal('booking_detail', booking)} className="hover:bg-blue-50/30 transition-colors cursor-pointer">
                                                <td className="p-4 pl-6"><p className="font-mono text-xs font-semibold text-gray-800">#{booking.booking_code}</p><div className="mt-1">{getSourceBadge(booking.booking_source)}</div></td>
                                                <td className="p-4"><p className="font-bold text-gray-800 text-xs">{booking.customer_name}</p><p className="text-[10px] text-gray-500">{booking.customer_phone}</p></td>
                                                <td className="p-4"><p className="font-semibold text-gray-800 text-xs">{booking.property?.name}</p><p className="text-[10px] text-gray-500">{booking.room_type?.name}</p></td>
                                                <td className="p-4 text-gray-500 text-[10px] font-medium">{new Date(booking.check_in_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} → {new Date(booking.check_out_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                                <td className="p-4">{getStatusBadge(booking.status)}</td>
                                                <td className="p-4 pr-6 text-right font-bold text-gray-800 text-xs">{formatRupiah(booking.total_price)}</td>
                                            </tr>
                                        ))}
                                        {displayBookings.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-gray-400 italic text-xs">No bookings found.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 4: PROPERTIES --- */}
                {activeTab === 'properties' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900">Manage Properties</h2><button onClick={() => openModal('property')} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black text-xs"><Plus size={16} /> Add Property</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {properties.map(prop => (
                                <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                                    <div className="h-40 bg-gray-200"><img src={prop.image_url} className="w-full h-full object-cover" alt={prop.name} /></div>
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div><h3 className="font-bold text-lg text-gray-900 mb-1">{prop.name}</h3><p className="text-xs text-gray-500 mb-4 truncate">{prop.address}</p></div>
                                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-50"><button onClick={() => openModal('property', prop)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDelete('property', prop.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 5: ROOMS --- */}
                {activeTab === 'rooms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900">Rooms & Pricing</h2><button onClick={() => openModal('room')} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black text-xs"><Plus size={16} /> Add Room Type</button></div>
                        {properties.map(prop => {
                            const hotelRooms = rooms.filter(r => r.property_id === prop.id);
                            if (hotelRooms.length === 0) return null;
                            return (
                                <div key={prop.id} className="mb-8">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Hotel size={16} /> {prop.name}</h3>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-400 uppercase text-[9px] tracking-widest font-bold"><tr><th className="p-4 pl-6">Room Name</th><th className="p-4">Capacity</th><th className="p-4">Stock</th><th className="p-4">Price (Daily)</th><th className="p-4 text-right pr-6">Actions</th></tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {hotelRooms.map(room => (
                                                    <tr key={room.id} className="hover:bg-gray-50"><td className="p-4 pl-6 font-bold text-gray-800">{room.name}</td><td className="p-4 text-xs text-gray-500">{room.capacity} Person</td><td className="p-4 text-xs font-bold text-blue-600">{room.total_stock} Unit</td><td className="p-4 font-bold text-gray-800 text-xs">{formatRupiah(room.price_daily || room.base_price)}</td><td className="p-4 pr-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => openModal('room', room)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDelete('room', room.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button></div></td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- TAB 6: STAFF --- */}
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900">Staff Control</h2><button onClick={() => openModal('staff')} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black text-xs"><Plus size={16} /> Add Staff</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{admin.full_name.charAt(0)}</div>
                                        <div className="flex gap-2"><button onClick={() => openModal('staff', admin)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Edit size={16} /></button><button onClick={() => handleDelete('staff', admin.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button></div>
                                    </div>
                                    <div><h3 className="font-bold text-lg text-gray-900">{admin.full_name}</h3><p className="text-xs text-gray-500">{admin.email}</p></div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center"><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</span><span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{admin.scope === 'all' ? 'All Branches' : admin.scope}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 7: PLATFORMS --- */}
                {activeTab === 'platforms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900">Platforms</h2><button onClick={() => openModal('platform')} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black text-xs"><Plus size={16} /> Add Platform</button></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {platforms.map(plat => (
                                <div key={plat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3"><Globe size={16} className="text-blue-500" /><span className="font-bold text-gray-800 text-sm">{plat.name}</span></div>
                                    <button onClick={() => handleDelete('platform', plat.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* --- MODAL GLOBAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200 print:static print:bg-white print:p-0 print:block print:z-auto">
                    <div className={`w-full ${getModalSize()} rounded-3xl p-0 max-h-[90vh] overflow-y-auto shadow-2xl relative transition-all duration-300 flex flex-col md:flex-row print:max-w-full print:w-full print:max-h-none print:shadow-none print:rounded-none print:overflow-visible print:block`}>
                        <button onClick={closeModal} className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-all text-gray-600 print:hidden"><X size={16} /></button>

                        {/* CASE 1: BOOKING DETAIL (SPLIT VIEW) */}
                        {modalType === 'booking_detail' && formData && (
                            <>
                                <div className="w-full md:w-[35%] bg-gray-50 p-8 border-r border-gray-100 overflow-y-auto print:w-full print:p-0 print:bg-white print:border-none print:mb-6 print:overflow-visible">
                                    <div className="mb-6 text-center">
                                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-serif font-bold">{formData.customer_name?.charAt(0)}</div>
                                        <h3 className="text-xl font-bold text-gray-900">{formData.customer_name}</h3>
                                        <div className="flex justify-center mt-2">{getSourceBadge(formData.booking_source)}</div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Contact Info</label>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div className="bg-green-100 p-2 rounded-lg text-green-600"><Phone size={14} /></div><p className="text-sm font-semibold text-gray-700">{formData.customer_phone || '-'}</p></div>
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Mail size={14} /></div><p className="text-sm font-semibold text-gray-700 truncate">{formData.customer_email || '-'}</p></div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-2"><MessageSquare size={12} /> Guest Notes</label>
                                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-gray-600 italic">"{formData.customer_notes || 'No special request.'}"</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-[65%] p-8 overflow-y-auto flex flex-col print:w-full print:p-0 print:overflow-visible">
                                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
                                        <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Booking ID</p><h2 className="text-2xl font-mono font-bold text-gray-900">#{formData.booking_code}</h2><p className="text-xs text-gray-400 mt-1">{new Date(formData.created_at).toLocaleString('en-US')}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Room Information</label><div className="flex items-start gap-3"><div className="bg-blue-50 p-3 rounded-xl text-blue-600"><MapPin size={20} /></div><div><p className="font-bold text-gray-900 text-lg">{formData.property?.name}</p><p className="text-sm text-gray-500">{formData.room_type?.name}</p></div></div></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Status</label><div>{getStatusBadge(formData.status)}</div></div>
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div><p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Check-In</p><p className="font-bold text-sm text-gray-900 mt-1">{new Date(formData.check_in_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                                            <div className="text-gray-300">➜</div>
                                            <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Check-Out</p><p className="font-bold text-sm text-gray-900 mt-1">{new Date(formData.check_out_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                                        </div>
                                        <div className="border-t border-gray-200 pt-4 flex justify-between items-center"><div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><CreditCard size={16} /> Total Paid</div><div className="text-2xl font-black text-gray-900">{formatRupiah(formData.total_price)}</div></div>
                                    </div>
                                    <div className="mt-auto flex gap-3 print:hidden">
                                        {formData.status !== 'cancelled' && (<button onClick={() => window.print()} className="w-full bg-white border border-gray-200 py-3.5 rounded-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"><Printer size={18} /> Print Details</button>)}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* CASE 2: MANUAL BOOKING FORM */}
                        {modalType === 'manual_booking' && (
                            <form onSubmit={handleManualSubmit} className="p-8 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2 border-b border-gray-100 pb-4 mb-2"><h3 className="text-2xl font-black text-gray-900">Manual Booking</h3><p className="text-xs text-gray-500 mt-1">Walk-in or Direct OTA Input</p></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Guest Name</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500" value={newBooking.customer_name} onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })} /></div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Source (Platform)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {platforms.map(plat => (
                                            <button key={plat.id} type="button" onClick={() => setNewBooking({ ...newBooking, booking_source: plat.slug })} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${newBooking.booking_source === plat.slug ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{plat.name}</button>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">WhatsApp</label><input required type="text" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500" value={newBooking.customer_phone} onChange={e => setNewBooking({ ...newBooking, customer_phone: e.target.value })} /></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email</label><input required type="email" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500" value={newBooking.customer_email} onChange={e => setNewBooking({ ...newBooking, customer_email: e.target.value })} /></div>
                                <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2"></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Select Room</label><select required className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500 bg-white text-sm" value={newBooking.room_type_id} onChange={e => handleRoomChange(e.target.value)}><option value="">-- Choose Room --</option>{rooms.map(r => (<option key={r.id} value={r.id}>{r.property?.name} - {r.name}</option>))}</select></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Total Price</label><input required type="number" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500 font-bold" value={newBooking.total_price} onChange={e => setNewBooking({ ...newBooking, total_price: parseInt(e.target.value) })} /></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Check-In</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500" value={newBooking.check_in_date} onChange={e => setNewBooking({ ...newBooking, check_in_date: e.target.value })} /></div>
                                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Check-Out</label><input required type="date" className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500" value={newBooking.check_out_date} onChange={e => setNewBooking({ ...newBooking, check_out_date: e.target.value })} /></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Notes</label><textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-blue-500 text-sm" rows={2} value={newBooking.notes} onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}></textarea></div>
                                <div className="md:col-span-2">
                                    {isChecking && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Checking availability...</p>}
                                    {availabilityMsg && (<div className={`text-xs p-3 rounded-lg border flex items-center gap-2 font-bold ${availabilityMsg.includes('TERISI') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}><AlertCircle size={16} /> {availabilityMsg}</div>)}
                                </div>
                                <div className="md:col-span-2 pt-2"><button type="submit" className={`w-full text-white py-4 rounded-xl font-bold transition-all text-xs tracking-widest uppercase ${availabilityMsg.includes('TERISI') ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-black'}`}>{availabilityMsg.includes('TERISI') ? 'Force Save (Overbooking)' : 'Save Booking'}</button></div>
                            </form>
                        )}

                        {/* CASE 3: GENERAL EDIT FORMS */}
                        {modalType !== 'booking_detail' && modalType !== 'manual_booking' && modalType !== '' && (
                            <div className="p-8 w-full">
                                <h3 className="font-black text-2xl text-gray-900 mb-6 capitalize">{editingId ? 'Edit' : 'Add'} {modalType}</h3>

                                {modalType === 'property' && (
                                    <div className="space-y-4 text-sm">
                                        <input placeholder="Hotel Name" value={formData.name || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <input placeholder="Address" value={formData.address || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-3"><UploadCloud size={16} className="text-blue-500" /> Upload Cover Image</label>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-600 cursor-pointer" />
                                            {(formData.preview_url || formData.image_url) && (<div className="mt-4 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200"><img src={formData.preview_url || formData.image_url} alt="Preview" className="w-full h-full object-cover" /></div>)}
                                        </div>

                                        {/* GALLERY IMAGES */}
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-3"><UploadCloud size={16} className="text-purple-500" /> Photo Gallery (max 5 foto)</label>
                                            <input
                                                type="file" accept="image/*" multiple
                                                onChange={handleGalleryChange}
                                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-600 cursor-pointer"
                                            />
                                            {/* Tampilkan gallery yang sudah ada (saat edit) */}
                                            {formData.gallery_images && formData.gallery_images.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Foto Tersimpan</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(formData.gallery_images as string[]).map((url, idx) => (
                                                            removedGalleryIndices.includes(idx) ? null : (
                                                                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 h-20">
                                                                    <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveExistingGallery(idx)}
                                                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    ><X size={10} /></button>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Preview file-file gallery baru */}
                                            {galleryPreviews.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Preview Baru</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {galleryPreviews.map((url, idx) => (
                                                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-purple-200 h-20">
                                                                <img src={url} alt={`New ${idx + 1}`} className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveNewGallery(idx)}
                                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                ><X size={10} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <textarea placeholder="Description" rows={3} value={formData.description || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        <button onClick={handleSave} disabled={uploading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex justify-center hover:bg-black">{uploading ? <Loader2 className="animate-spin" /> : "Save Property"}</button>
                                    </div>
                                )}

                                {modalType === 'room' && (
                                    <div className="space-y-4 text-sm">
                                        <select className="w-full p-3 border rounded-xl bg-white outline-none focus:border-blue-500" value={formData.property_id || ''} onChange={e => setFormData({ ...formData, property_id: e.target.value })}><option value="">Select Property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                        <input placeholder="Room Name" value={formData.name || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <div className="grid grid-cols-3 gap-4"><input type="number" placeholder="Daily Price" value={formData.price_daily || ''} className="w-full p-3 border rounded-xl" onChange={e => setFormData({ ...formData, price_daily: e.target.value })} /><input type="number" placeholder="Weekly Price" value={formData.price_weekly || ''} className="w-full p-3 border rounded-xl" onChange={e => setFormData({ ...formData, price_weekly: e.target.value })} /><input type="number" placeholder="Monthly Price" value={formData.price_monthly || ''} className="w-full p-3 border rounded-xl" onChange={e => setFormData({ ...formData, price_monthly: e.target.value })} /></div>
                                        <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Capacity" value={formData.capacity || ''} className="w-full p-3 border rounded-xl" onChange={e => setFormData({ ...formData, capacity: e.target.value })} /><input type="number" placeholder="Total Stock" value={formData.total_stock || ''} className="w-full p-3 border rounded-xl font-bold" onChange={e => setFormData({ ...formData, total_stock: e.target.value })} /></div>
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-3"><UploadCloud size={16} className="text-blue-500" /> Upload Room Image</label>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-blue-100 file:text-blue-600 cursor-pointer" />
                                            {(formData.preview_url || formData.image_url) && (<div className="mt-4 relative w-full h-32 rounded-xl overflow-hidden border border-gray-200"><img src={formData.preview_url || formData.image_url} alt="Preview" className="w-full h-full object-cover" /></div>)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2">{facilityOptions.map(fac => (<label key={fac} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer"><input type="checkbox" checked={selectedFacilities.includes(fac)} onChange={() => handleFacilityChange(fac)} className="accent-blue-600 w-4 h-4" /> {fac}</label>))}</div>
                                        <button onClick={handleSave} disabled={uploading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex justify-center hover:bg-black mt-4">{uploading ? <Loader2 className="animate-spin" /> : "Save Room"}</button>
                                    </div>
                                )}

                                {modalType === 'staff' && (
                                    <div className="space-y-4 text-sm">
                                        <input placeholder="Full Name" value={formData.full_name || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                                        <input placeholder="Email" type="email" value={formData.email || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        <input placeholder="Password (Kosongkan jika tidak diubah)" type="password" value={formData.password || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                        <select className="w-full p-3 border rounded-xl bg-white outline-none focus:border-blue-500" value={formData.scope || ''} onChange={e => setFormData({ ...formData, scope: e.target.value })}><option value="">-- Assign to Branch --</option>{properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
                                        <button onClick={handleSave} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black">{editingId ? 'Update Account' : 'Create Account'}</button>
                                    </div>
                                )}

                                {modalType === 'platform' && (
                                    <div className="space-y-4 text-sm">
                                        <input placeholder="Ex: Traveloka, Agoda" value={formData.name || ''} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        <button onClick={handleSave} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black">Save Platform</button>
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