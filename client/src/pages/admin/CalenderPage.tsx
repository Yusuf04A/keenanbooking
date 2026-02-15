import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar as CalendarIcon, User, Plus, X, Phone, Mail, MessageSquare, AlertCircle } from 'lucide-react';

export default function CalendarPage() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityMsg, setAvailabilityMsg] = useState('');

    const [rooms, setRooms] = useState<any[]>([]);
    // Pastikan state awal memiliki semua field
    const [newBooking, setNewBooking] = useState({
        customer_name: '', customer_email: '', customer_phone: '',
        room_type_id: '', check_in_date: '', check_out_date: '',
        total_price: 0, notes: '',
        booking_source: 'walk_in' // <--- Default untuk admin
    });

    const adminName = localStorage.getItem('keenan_admin_name') || 'Admin';
    const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';

    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchBookingsToEvents(), fetchRooms()]);
            setLoading(false);
        };
        init();
    }, []);

    // LOGIC CEK KETERSEDIAAN (ALLOTMENT)
    useEffect(() => {
        if (newBooking.room_type_id && newBooking.check_in_date && newBooking.check_out_date) {
            checkAvailability();
        }
    }, [newBooking.room_type_id, newBooking.check_in_date, newBooking.check_out_date]);

    const checkAvailability = async () => {
        setIsChecking(true);
        setAvailabilityMsg('');

        const { data } = await supabase
            .from('bookings')
            .select('id')
            .eq('room_type_id', newBooking.room_type_id)
            .neq('status', 'cancelled')
            .or(`and(check_in_date.lte.${newBooking.check_out_date},check_out_date.gte.${newBooking.check_in_date})`);

        if (data && data.length > 0) {
            setAvailabilityMsg('⚠️ TERISI: Overbooking Warning!');
        } else {
            setAvailabilityMsg('✅ Kamar Tersedia');
        }
        setIsChecking(false);
    };

    const fetchRooms = async () => {
        try {
            let query = supabase.from('room_types').select(`id, name, base_price, property_id, properties(name)`);
            const { data, error } = await query;
            if (error) throw error;

            const filteredRooms = (data || []).filter(room => {
                if (adminScope === 'all') return true;
                const propName = room.properties?.name || '';
                return propName.toLowerCase().includes(adminScope.toLowerCase());
            });

            setRooms(filteredRooms);
        } catch (err) {
            console.error("Error fetch rooms:", err);
        }
    };

    const fetchBookingsToEvents = async () => {
        try {
            let query = supabase.from('bookings').select(`
                id, customer_name, check_in_date, check_out_date, status, 
                room_types ( name ), properties ( name )
            `);

            const { data } = await query;
            if (data) {
                // Filter berdasarkan Scope Admin
                const filteredData = data.filter(b => {
                    if (adminScope === 'all') return true;
                    return b.properties?.name.toLowerCase().includes(adminScope.toLowerCase());
                });

                const formattedEvents = filteredData.map(booking => {
                    // --- LOGIKA WARNA BARU DISINI ---
                    let bgColor = '#C5A059'; // Default: Gold (Paid)

                    switch (booking.status) {
                        case 'checked_in':
                            bgColor = '#2563EB'; // Biru (Sedang Menginap)
                            break;
                        case 'checked_out':
                            bgColor = '#ff6767'; // Merah (Sudah Pulang)
                            break;
                        case 'cancelled':
                            bgColor = '#94A3B8'; // Abu-abu (Batal)
                            break;
                        case 'pending_payment':
                            bgColor = '#8e8e8e'; // Orange (Belum Bayar)
                            break;
                        default:
                            bgColor = '#C5A059'; // Paid
                    }

                    return {
                        id: booking.id,
                        title: `${booking.customer_name} (${booking.room_types?.name})`,
                        start: booking.check_in_date,
                        end: booking.check_out_date,
                        backgroundColor: bgColor, // <--- Pakai warna yang sudah dipilih
                        borderColor: 'transparent',
                        textColor: '#ffffff', // Semua tulisan jadi putih biar kontras
                        extendedProps: {
                            status: booking.status,
                            guest: booking.customer_name,
                            room: booking.room_types?.name
                        }
                    };
                });
                setEvents(formattedEvents);
            }
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
                total_price: selectedRoom.base_price
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

        const orderId = `MANUAL-${Date.now()}`;

        // PERBAIKAN: Mapping nama field sesuai database kamu
        const { error } = await supabase.from('bookings').insert([{
            booking_code: orderId,
            customer_name: newBooking.customer_name,
            customer_email: newBooking.customer_email || 'manual@admin.com',
            customer_phone: newBooking.customer_phone || '-',
            room_type_id: newBooking.room_type_id,
            property_id: selectedRoom.property_id,
            check_in_date: newBooking.check_in_date,
            check_out_date: newBooking.check_out_date,
            booking_source: newBooking.booking_source,
            status: 'paid',
            total_price: newBooking.total_price,
            payment_method: 'manual_offline',
            customer_notes: newBooking.notes // <-- PENTING: Map ke 'customer_notes'
        }]);

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("✅ Booking Berhasil Disimpan!");
            setIsModalOpen(false);
            setNewBooking({
                customer_name: '', customer_email: '', customer_phone: '',
                room_type_id: '', check_in_date: '', check_out_date: '',
                total_price: 0, notes: ''
            });
            fetchBookingsToEvents();
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-keenan-dark pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-6 mb-8 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/admin/dashboard')} className="p-3 hover:bg-gray-50 rounded-xl text-keenan-gold border border-gray-100 transition-all shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <CalendarIcon size={18} className="text-keenan-gold" />
                                <h1 className="text-2xl font-serif font-bold tracking-tight">Reservation Calendar</h1>
                            </div>
                            <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Scope: {adminScope}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-keenan-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg text-sm tracking-widest">
                        <Plus size={18} /> ADD MANUAL BOOKING
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8">
                <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-gray-100 custom-calendar overflow-hidden">
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

            {/* MODAL INPUT MANUAL - FORM SUDAH DIPERBAIKI */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="bg-keenan-dark p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-serif font-bold tracking-wide">Manual Booking</h3>
                                <p className="text-xs text-keenan-gold uppercase tracking-[0.2em]">Input Tamu Walk-in / WhatsApp</p>
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
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Sumber Booking (OTA)</label>
                                <div className="flex flex-wrap gap-2">
                                    {['walk_in', 'agoda', 'traveloka', 'tiket.com', 'booking.com', 'airbnb'].map((source) => (
                                        <button
                                            key={source}
                                            type="button"
                                            onClick={() => setNewBooking({ ...newBooking, booking_source: source })}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${newBooking.booking_source === source
                                                ? 'bg-keenan-gold text-white border-keenan-gold'
                                                : 'bg-white text-gray-400 border-gray-200 hover:border-keenan-gold'
                                                }`}
                                        >
                                            {source.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* FIELD HP & EMAIL DIKEMBALIKAN */}
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
                                        <option key={r.id} value={r.id}>{r.properties?.name} - {r.name}</option>
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

                            {/* FIELD NOTES DIKEMBALIKAN */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><MessageSquare size={12} /> Catatan (Notes)</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-keenan-gold text-sm" rows={2} placeholder="Permintaan khusus..."
                                    value={newBooking.notes}
                                    onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}></textarea>
                            </div>

                            {/* ALERT KETERSEDIAAN */}
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