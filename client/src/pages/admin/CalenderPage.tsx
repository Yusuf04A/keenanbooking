import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../../lib/api';
import { sendWhatsAppInvoice } from '../../lib/fonnte';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut as LogOutIcon, Calendar as CalendarIcon, Loader2, User, Plus, X, Phone, Mail, MessageSquare, AlertCircle, Globe } from 'lucide-react';

export default function CalendarPage() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Availability Check State
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityMsg, setAvailabilityMsg] = useState('');

    const [rooms, setRooms] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);

    // Booking Form State
    const [newBooking, setNewBooking] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        room_type_id: '',
        check_in_date: '',
        check_out_date: '',
        total_price: 0,
        notes: '',
        booking_source: ''
    });

    const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchBookingsToEvents(), fetchRooms(), fetchPlatforms()]);
            setLoading(false);
        };
        init();
    }, []);

    // LOGIC CEK KETERSEDIAAN
    useEffect(() => {
        if (newBooking.room_type_id && newBooking.check_in_date && newBooking.check_out_date) {
            checkAvailability();
        }
    }, [newBooking.room_type_id, newBooking.check_in_date, newBooking.check_out_date]);

    const checkAvailability = async () => {
        setIsChecking(true);
        setAvailabilityMsg('');

        try {
            const startDate = new Date(newBooking.check_in_date);
            const endDate = new Date(newBooking.check_out_date);

            const conflict = events.find(event => {
                if (event.extendedProps.room_id !== newBooking.room_type_id) return false;
                if (event.extendedProps.status === 'cancelled') return false;

                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);

                return (startDate < eventEnd && endDate > eventStart);
            });

            if (conflict) {
                setAvailabilityMsg('⚠️ TERISI: Kamar ini sudah ada yang pesan di tanggal tersebut!');
            } else {
                setAvailabilityMsg('✅ Kamar Tersedia');
            }

        } catch (error) {
            console.error("Error checking availability", error);
        } finally {
            setIsChecking(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await api.get('/admin/rooms');
            let data = response.data;
            if (adminScope !== 'all') {
                data = data.filter((r: any) => r.property?.name === adminScope);
            }
            setRooms(data || []);
        } catch (err) {
            console.error("Error fetch rooms:", err);
        }
    };

    const fetchPlatforms = async () => {
        try {
            const response = await api.get('/admin/platforms');
            setPlatforms(response.data || []);

            if (response.data && response.data.length > 0) {
                setNewBooking(prev => ({ ...prev, booking_source: response.data[0].slug }));
            } else {
                setNewBooking(prev => ({ ...prev, booking_source: 'walk_in' }));
            }
        } catch (err) {
            console.error("Error fetch platforms:", err);
            setPlatforms([
                { id: 1, name: 'Walk-in', slug: 'walk_in' },
                { id: 2, name: 'Agoda', slug: 'agoda' },
                { id: 3, name: 'Traveloka', slug: 'traveloka' }
            ]);
        }
    };

    const fetchBookingsToEvents = async () => {
        try {
            const response = await api.get('/admin/bookings');
            let data = response.data;

            if (adminScope !== 'all') {
                data = data.filter((b: any) => b.property?.name === adminScope);
            }

            const formattedEvents = data.map((booking: any) => {
                let bgColor = '#C5A059';
                switch (booking.status) {
                    case 'checked_in': bgColor = '#2563EB'; break;
                    case 'checked_out': bgColor = '#EF4444'; break;
                    case 'cancelled': bgColor = '#94A3B8'; break;
                    case 'pending': bgColor = '#F59E0B'; break;
                    default: bgColor = '#C5A059';
                }

                return {
                    id: booking.id,
                    title: `${booking.customer_name} (${booking.room_type?.name})`,
                    start: booking.check_in_date,
                    end: booking.check_out_date,
                    backgroundColor: bgColor,
                    borderColor: 'transparent',
                    textColor: '#ffffff',
                    extendedProps: {
                        status: booking.status,
                        guest: booking.customer_name,
                        room: booking.room_type?.name,
                        room_id: booking.room_type_id
                    }
                };
            });

            setEvents(formattedEvents);
        } catch (err) {
            console.error("Error fetch bookings:", err);
        }
    };

    const handleRoomChange = (roomId: string) => {
        const selectedRoom = rooms.find(r => r.id === roomId);
        if (selectedRoom) {
            setNewBooking({
                ...newBooking,
                room_type_id: roomId,
                total_price: Number(selectedRoom.price_daily || selectedRoom.base_price)
            });
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (availabilityMsg.includes('TERISI')) {
            if (!confirm("Kamar ini sudah terisi! Yakin mau tetap input (Overbooking)?")) return;
        }

        const selectedRoom = rooms.find(r => r.id === newBooking.room_type_id);
        if (!selectedRoom) return alert("Pilih tipe kamar!");

        try {
            // 1. Create Booking (Pending)
            const res = await api.post('/midtrans/create-transaction', {
                property_id: selectedRoom.property_id,
                room_type_id: newBooking.room_type_id,
                customer_name: newBooking.customer_name,
                customer_email: newBooking.customer_email || 'manual@admin.com',
                customer_phone: newBooking.customer_phone || '-',
                check_in_date: newBooking.check_in_date,
                check_out_date: newBooking.check_out_date,
                total_price: newBooking.total_price,
                customer_notes: newBooking.notes,
                booking_source: newBooking.booking_source,
            });

            const bookingData = res.data.booking;

            // 2. Langsung Update jadi PAID (Ini akan mentrigger EMAIL di Backend)
            await api.put(`/admin/bookings/${bookingData.id}/status`, {
                status: 'paid'
            });

            // 3. KIRIM WHATSAPP (Logic Frontend)
            // Pastikan format nomor HP benar
            await sendWhatsAppInvoice(
                newBooking.customer_phone,
                newBooking.customer_name,
                bookingData.booking_code,
                selectedRoom.property?.name || 'Keenan Living', // Ambil nama property
                selectedRoom.name,
                newBooking.check_in_date,
                newBooking.check_out_date,
                newBooking.total_price,
                "" // PDF kosong karena manual booking gak ada PDF Midtrans
            );

            alert("✅ Manual Booking Berhasil & Notifikasi Terkirim!");
            setIsModalOpen(false);

            // Reset Form
            setNewBooking({
                customer_name: '', customer_email: '', customer_phone: '',
                room_type_id: '', check_in_date: '', check_out_date: '',
                total_price: 0, notes: '',
                booking_source: platforms.length > 0 ? platforms[0].slug : 'walk_in'
            });

            fetchBookingsToEvents();

        } catch (error: any) {
            console.error(error);
            alert("Gagal simpan: " + (error.response?.data?.message || error.message));
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/admin/login');
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-800">
            {/* SIDEBAR - Sama persis dengan Dashboard.tsx */}
            <div className="w-64 bg-keenan-dark border-r border-gray-100 p-6 hidden md:flex flex-col fixed h-full z-10">
                <div className="mb-10 text-center">
                    <h2 className="text-2xl font-black text-white tracking-tight">KEENAN</h2>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 font-bold">Workspace</p>
                </div>
                <nav className="space-y-1">
                    <button onClick={() => navigate('/admin/dashboard')} className="w-full flex items-center gap-3 hover:bg-gray-50/10 text-gray-400 p-3 rounded-xl font-medium transition-all">
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button className="w-full flex items-center gap-3 bg-keenan-gold text-white p-3 rounded-xl font-bold">
                        <CalendarIcon size={18} /> Calendar
                    </button>
                </nav>
                <button onClick={handleLogout} className="mt-auto flex items-center justify-center gap-2 p-3 rounded-xl text-gray-400 hover:bg-red-50/10 hover:text-red-400 font-bold text-sm transition-colors">
                    <LogOutIcon size={18} /> Logout
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-6 lg:p-8 overflow-x-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarIcon size={18} className="text-keenan-gold" />
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reservation Calendar</h1>
                        </div>
                        <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Scope: {adminScope}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg text-sm">
                        <Plus size={18} /> Add Manual Booking
                    </button>
                </div>

                <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-gray-100 custom-calendar overflow-hidden">
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={events}
                        height="auto"
                        dayMaxEvents={true}
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
                    />
                </div>
            </div>

            {/* MODAL INPUT MANUAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="bg-keenan-dark p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-serif font-bold tracking-wide">Manual Booking</h3>
                                <p className="text-xs text-keenan-gold uppercase tracking-[0.2em]">Input Tamu Walk-in / OTA</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform p-2"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><User size={12} /> Nama Lengkap</label>
                                <input required type="text" placeholder="Nama Tamu" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_name}
                                    onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Globe size={12} /> Sumber Booking (Platform)
                                </label>

                                <div className="flex flex-wrap gap-2">
                                    {platforms.length > 0 ? (
                                        platforms.map((plat) => (
                                            <button
                                                key={plat.id}
                                                type="button"
                                                onClick={() => setNewBooking({ ...newBooking, booking_source: plat.slug })}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${newBooking.booking_source === plat.slug
                                                    ? 'bg-keenan-gold text-white border-keenan-gold shadow-md'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-keenan-gold hover:text-keenan-dark'
                                                    }`}
                                            >
                                                {plat.name}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Belum ada platform. Tambahkan di Dashboard Superadmin.</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><Phone size={12} /> No. WhatsApp</label>
                                <input required type="text" placeholder="0812..." className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_phone}
                                    onChange={e => setNewBooking({ ...newBooking, customer_phone: e.target.value })} />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><Mail size={12} /> Email Tamu</label>
                                <input required type="email" placeholder="email@tamu.com" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_email}
                                    onChange={e => setNewBooking({ ...newBooking, customer_email: e.target.value })} />
                            </div>

                            <div className="md:col-span-2 border-t pt-4"></div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Pilih Kamar</label>
                                <select required className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold bg-white"
                                    value={newBooking.room_type_id}
                                    onChange={e => handleRoomChange(e.target.value)}
                                >
                                    <option value="">-- {rooms.length > 0 ? 'Pilih Tipe Kamar' : 'Memuat Kamar...'} --</option>
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.property?.name} - {r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Total Harga</label>
                                <input required type="number" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold font-bold"
                                    value={newBooking.total_price}
                                    onChange={e => setNewBooking({ ...newBooking, total_price: parseInt(e.target.value) })} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Check-In</label>
                                <input required type="date" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold"
                                    value={newBooking.check_in_date}
                                    onChange={e => setNewBooking({ ...newBooking, check_in_date: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Check-Out</label>
                                <input required type="date" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold"
                                    value={newBooking.check_out_date}
                                    onChange={e => setNewBooking({ ...newBooking, check_out_date: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><MessageSquare size={12} /> Catatan (Notes)</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-keenan-gold text-sm" rows={2} placeholder="Permintaan khusus..."
                                    value={newBooking.notes}
                                    onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}></textarea>
                            </div>

                            <div className="md:col-span-2">
                                {isChecking && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Mengecek ketersediaan...</p>}
                                {availabilityMsg && (
                                    <div className={`text-xs p-2 rounded border flex items-center gap-2 ${availabilityMsg.includes('TERISI') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                        <AlertCircle size={14} /> {availabilityMsg}
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 pt-2">
                                <button type="submit"
                                    className={`w-full text-white py-4 rounded-xl font-bold shadow-lg transition-all tracking-widest uppercase text-sm ${availabilityMsg.includes('TERISI') ? 'bg-red-400 hover:bg-red-500' : 'bg-keenan-gold hover:bg-keenan-dark'}`}
                                >
                                    {availabilityMsg.includes('TERISI') ? 'Paksa Simpan (Overbooking)' : 'Simpan Reservasi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-calendar .fc-toolbar-title { font-family: serif !important; font-weight: 700; color: #1A1A1A; font-size: 1.4rem !important; }
                .custom-calendar .fc-button { background: #ffffff !important; border: 1px solid #f1f5f9 !important; color: #64748b !important; font-size: 0.7rem !important; font-weight: bold !important; text-transform: uppercase !important; border-radius: 8px !important; }
                .custom-calendar .fc-button-active { background: #1A1A1A !important; color: #C5A059 !important; border-color: #1A1A1A !important; }
                .fc-day-today { background: rgba(197, 160, 89, 0.05) !important; }
            `}</style>
        </div>
    );
}