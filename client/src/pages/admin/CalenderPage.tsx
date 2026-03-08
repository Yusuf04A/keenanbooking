import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'; // Wajib ada untuk Gantt Chart
import { api } from '../../lib/api';
import { sendWhatsAppInvoice } from '../../lib/fonnte';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut as LogOutIcon, Calendar as CalendarIcon, Loader2, User, Plus, X, Phone, Mail, MessageSquare, AlertCircle, Globe } from 'lucide-react';

export default function CalendarPage() {
    const navigate = useNavigate();
    
    // State Kalender Gantt Chart
    const [events, setEvents] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]); // Menyimpan baris sumbu Y (Nomor Kamar)
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State Ketersediaan & Data
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityMsg, setAvailabilityMsg] = useState('');
    const [rooms, setRooms] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);

    // Form Manual Booking (DITAMBAH: assigned_room_number)
    const [newBooking, setNewBooking] = useState({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        room_type_id: '',
        assigned_room_number: '', // Tambahan untuk mengunci nomor fisik kamar
        check_in_date: new Date().toISOString().split('T')[0], // Default Hari Ini
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Default Besok
        total_price: 0,
        notes: '',
        booking_source: ''
    });

    const adminScope = localStorage.getItem('keenan_admin_scope') || 'all';

    useEffect(() => {
        const init = async () => {
            const fetchedRooms = await fetchRooms();
            await fetchBookingsToEvents(fetchedRooms);
            await fetchPlatforms();
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (newBooking.room_type_id && newBooking.check_in_date && newBooking.check_out_date) {
            checkAvailability();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newBooking.room_type_id, newBooking.assigned_room_number, newBooking.check_in_date, newBooking.check_out_date]);

    // --- LOGIKA CEK KETERSEDIAAN KAMAR SPESIFIK ---
    const checkAvailability = async () => {
        if (!newBooking.assigned_room_number) {
            setAvailabilityMsg('');
            return;
        }

        setIsChecking(true);
        setAvailabilityMsg('');

        try {
            const startDate = new Date(newBooking.check_in_date);
            const endDate = new Date(newBooking.check_out_date);
            const specificRoomId = `${newBooking.room_type_id}-${newBooking.assigned_room_number}`;

            let isConflict = false;
            events.forEach(event => {
                if (event.resourceId === specificRoomId && event.extendedProps.status !== 'cancelled') {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    if (startDate < eventEnd && endDate > eventStart) {
                        isConflict = true;
                    }
                }
            });

            if (isConflict) {
                setAvailabilityMsg(`⚠️ TERISI: Kamar ${newBooking.assigned_room_number} penuh di tanggal ini!`);
            } else {
                setAvailabilityMsg(`✅ Kamar ${newBooking.assigned_room_number} Tersedia`);
            }
        } catch (error) {
            console.error("Error checking availability", error);
        } finally {
            setIsChecking(false);
        }
    };

    // MENGATUR SUMBU Y KALENDER (Daftar Kamar di Kiri)
    const fetchRooms = async () => {
        try {
            const response = await api.get('/admin/rooms');
            let data = response.data;
            if (adminScope !== 'all') {
                data = data.filter((r: any) => r.property?.name === adminScope);
            }
            setRooms(data || []);
            
            // Pengelompokan: Harian vs Bulanan
            const groupedResources = [
                { id: 'kategori-harian', title: 'HARIAN', children: [] as any[] },
                { id: 'kategori-bulanan', title: 'BULANAN', children: [] as any[] }
            ];
            
            data.forEach((rt: any) => {
                // Perbaikan: Deteksi yang lebih kuat untuk kategori bulanan
                const isMonthly = rt.rental_category === 'bulanan' || rt.room_category === 'monthly';
                const targetGroup = isMonthly ? groupedResources[1] : groupedResources[0];

                let rNums: string[] = [];
                try {
                    if (Array.isArray(rt.room_numbers)) rNums = rt.room_numbers;
                    else if (typeof rt.room_numbers === 'string') rNums = JSON.parse(rt.room_numbers);
                } catch(e) {}

                // Jika di database room_numbers masih NULL, kita generate angka sementara (1, 2, 3...)
                if (!Array.isArray(rNums) || rNums.length === 0) {
                    rNums = Array.from({length: rt.total_stock}, (_, i) => `${rt.name.substring(0,3)}-${i+1}`);
                }

                rNums.forEach(num => {
                    targetGroup.children.push({
                        id: `${rt.id}-${num}`, // ID Unik Fisik Kamar (Sangat Penting)
                        title: `Room ${num}`,
                        extendedProps: { type: rt.name }
                    });
                });
            });

            setResources(groupedResources.filter(g => g.children.length > 0));
            return data;
        } catch (err) {
            console.error("Error fetch rooms:", err);
            return [];
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
            setPlatforms([{ id: 1, name: 'Walk-in', slug: 'walk_in' }]);
        }
    };

    // MENGATUR BLOK WARNA (EVENT) DI DALAM BARIS KAMAR
    const fetchBookingsToEvents = async (loadedRooms: any[]) => {
        try {
            const response = await api.get('/admin/bookings');
            let data = response.data;

            if (adminScope !== 'all') {
                data = data.filter((b: any) => b.property?.name === adminScope);
            }

            // PERBAIKAN: Urutkan data berdasarkan waktu pembuatan agar tamu yang order duluan dapat kamar duluan
            data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const roomAssignments: Record<string, any[]> = {}; 

            const formattedEvents = data.map((booking: any) => {
                let bgColor = '#C5A059';
                switch (booking.status) {
                    case 'checked_in': bgColor = '#2563EB'; break;
                    case 'checked_out': bgColor = '#10B981'; break;
                    case 'cancelled': bgColor = '#94A3B8'; break;
                    case 'pending': bgColor = '#F59E0B'; break;
                    default: bgColor = '#C5A059';
                }

                let assignedPhysicalRoomId = `${booking.room_type_id}-fallback`;
                const roomType = loadedRooms.find(r => r.id === booking.room_type_id);
                
                // Prioritas 1: Jika admin sudah memasukkan assigned_room_number di database
                if (booking.assigned_room_number) {
                    assignedPhysicalRoomId = `${booking.room_type_id}-${booking.assigned_room_number}`;
                    if(!roomAssignments[assignedPhysicalRoomId]) roomAssignments[assignedPhysicalRoomId] = [];
                    roomAssignments[assignedPhysicalRoomId].push({ start: new Date(booking.check_in_date), end: new Date(booking.check_out_date) });
                } 
                // Prioritas 2: Auto-fallback untuk tamu online
                else if (roomType) {
                    let rNums: string[] = [];
                    try { 
                        if (Array.isArray(roomType.room_numbers)) rNums = roomType.room_numbers;
                        else if (typeof roomType.room_numbers === 'string') rNums = JSON.parse(roomType.room_numbers);
                    } catch(e){}
                    if (!Array.isArray(rNums) || rNums.length === 0) rNums = Array.from({length: roomType.total_stock}, (_, i) => `${roomType.name.substring(0,3)}-${i+1}`);

                    for (let rNum of rNums) {
                        const testId = `${booking.room_type_id}-${rNum}`;
                        const isOccupied = (roomAssignments[testId] || []).some(existing => {
                            return new Date(booking.check_in_date) < existing.end && new Date(booking.check_out_date) > existing.start;
                        });
                        
                        if (!isOccupied) {
                            assignedPhysicalRoomId = testId;
                            if(!roomAssignments[testId]) roomAssignments[testId] = [];
                            roomAssignments[testId].push({ start: new Date(booking.check_in_date), end: new Date(booking.check_out_date) });
                            break;
                        }
                    }
                }

                return {
                    id: booking.id,
                    resourceId: assignedPhysicalRoomId, // INI YANG MENGHUBUNGKAN BLOK WARNA KE BARIS KAMAR
                    title: `${booking.customer_name}`,
                    start: booking.check_in_date,
                    end: booking.check_out_date,
                    backgroundColor: bgColor,
                    borderColor: 'transparent',
                    textColor: '#ffffff',
                    extendedProps: {
                        status: booking.status,
                        room_type_id: booking.room_type_id
                    }
                };
            });

            setEvents(formattedEvents);
        } catch (err) {
            console.error("Error fetch bookings:", err);
        }
    };

    // --- FUNGSI HELPER UNTUK DROPDOWN LIST KAMAR SPESIFIK ---
    const getRoomOptions = () => {
        let options: any[] = [];
        rooms.forEach(r => {
            let rNums: string[] = [];
            try { 
                if (Array.isArray(r.room_numbers)) rNums = r.room_numbers;
                else if (typeof r.room_numbers === 'string') rNums = JSON.parse(r.room_numbers);
            } catch(e) {}
            
            if (!Array.isArray(rNums) || rNums.length === 0) {
                rNums = Array.from({length: r.total_stock || 1}, (_, i) => `${r.name.substring(0,3)}-${i+1}`);
            }
            
            rNums.forEach(num => {
                options.push({
                    id: `${r.id}|${num}`, // Kita simpan room_type_id & assigned_room_number di valuenya
                    label: `${r.property?.name} - ${r.name} (Kamar ${num})`,
                    isMonthly: r.rental_category === 'bulanan' || r.room_category === 'monthly'
                });
            });
        });
        return options;
    };

    // --- LOGIKA CERDAS SAAT ADMIN PILIH KAMAR (AUTO HARGA & CHECKOUT BULANAN) ---
    const handleRoomSelection = (value: string) => {
        if (!value) {
            setNewBooking(prev => ({ ...prev, room_type_id: '', assigned_room_number: '', total_price: 0 }));
            return;
        }

        const [roomId, roomNumber] = value.split('|');
        const selectedRoom = rooms.find(r => r.id === roomId);
        
        if (selectedRoom) {
            const isMonthly = selectedRoom.rental_category === 'bulanan' || selectedRoom.room_category === 'monthly';
            let checkOutDate = newBooking.check_out_date;
            let price = 0;

            if (isMonthly) {
                // Jika bulanan, otomatis 1 bulan ke depan dari tanggal Check-In
                const d = new Date(newBooking.check_in_date);
                d.setMonth(d.getMonth() + 1);
                checkOutDate = d.toISOString().split('T')[0];
                price = Number(selectedRoom.price_monthly) || 0;
            } else {
                // Jika harian, pastikan minimal 1 hari dari Check-In
                if (newBooking.check_in_date >= checkOutDate) {
                    const d = new Date(newBooking.check_in_date);
                    d.setDate(d.getDate() + 1);
                    checkOutDate = d.toISOString().split('T')[0];
                }
                const start = new Date(newBooking.check_in_date);
                const end = new Date(checkOutDate);
                const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                price = (Number(selectedRoom.price_daily) || Number(selectedRoom.base_price) || 0) * nights;
            }

            setNewBooking(prev => ({
                ...prev,
                room_type_id: roomId,
                assigned_room_number: roomNumber,
                check_out_date: checkOutDate,
                total_price: price
            }));
        }
    };

    // --- LOGIKA CERDAS SAAT ADMIN MENGUBAH TANGGAL CHECK-IN ---
    const handleCheckInChange = (newDate: string) => {
        const selectedRoom = rooms.find(r => r.id === newBooking.room_type_id);
        const isMonthly = selectedRoom?.rental_category === 'bulanan' || selectedRoom?.room_category === 'monthly';
        
        let checkOutDate = newBooking.check_out_date;

        if (isMonthly) {
            const d = new Date(newDate);
            d.setMonth(d.getMonth() + 1);
            checkOutDate = d.toISOString().split('T')[0];
        } else if (newDate >= checkOutDate) {
            const d = new Date(newDate);
            d.setDate(d.getDate() + 1);
            checkOutDate = d.toISOString().split('T')[0];
        }

        setNewBooking(prev => ({ ...prev, check_in_date: newDate, check_out_date: checkOutDate }));
    };


    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (availabilityMsg.includes('TERISI')) {
            if (!confirm("Kamar ini terisi penuh! Yakin mau tetap input (Overbooking)?")) return;
        }

        const selectedRoom = rooms.find(r => r.id === newBooking.room_type_id);
        if (!selectedRoom) return alert("Pilih tipe kamar!");
        if (!newBooking.assigned_room_number) return alert("Pilih Nomor Fisik Kamar!");

        try {
            const res = await api.post('/midtrans/create-transaction', {
                property_id: selectedRoom.property_id,
                room_type_id: newBooking.room_type_id,
                customer_name: newBooking.customer_name,
                customer_email: newBooking.customer_email || 'walkin@keenan.com',
                customer_phone: newBooking.customer_phone || '-',
                check_in_date: newBooking.check_in_date,
                check_out_date: newBooking.check_out_date,
                total_price: newBooking.total_price,
                customer_notes: newBooking.notes,
                booking_source: newBooking.booking_source,
                assigned_room_number: newBooking.assigned_room_number // Mengirim spesifik kamar fisik
            });

            const bookingData = res.data.booking;

            await api.put(`/admin/bookings/${bookingData.id}/status`, { status: 'paid' });

            if (newBooking.customer_phone && newBooking.customer_phone !== '-') {
                await sendWhatsAppInvoice(
                    newBooking.customer_phone,
                    newBooking.customer_name,
                    bookingData.booking_code,
                    selectedRoom.property?.name || 'Keenan Living',
                    `${selectedRoom.name} - Kamar ${newBooking.assigned_room_number}`,
                    newBooking.check_in_date,
                    newBooking.check_out_date,
                    newBooking.total_price,
                    ""
                );
            }

            alert("✅ Manual Booking Berhasil!");
            setIsModalOpen(false);

            setNewBooking({
                customer_name: '', customer_email: '', customer_phone: '',
                room_type_id: '', assigned_room_number: '',
                check_in_date: new Date().toISOString().split('T')[0],
                check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                total_price: 0, notes: '',
                booking_source: platforms.length > 0 ? platforms[0].slug : 'walk_in'
            });

            fetchBookingsToEvents(rooms);

        } catch (error: any) {
            alert("Gagal simpan: " + (error.response?.data?.message || error.message));
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/admin/login');
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-gray-800">
            {/* SIDEBAR */}
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
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarIcon size={18} className="text-keenan-gold" />
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Timeline & Availability</h1>
                        </div>
                        <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Scope: {adminScope}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg text-sm">
                        <Plus size={18} /> Add Manual Booking
                    </button>
                </div>

                {/* KALENDER TIMELINE (GANTT CHART) */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 custom-calendar overflow-hidden">
                    <FullCalendar
                        plugins={[resourceTimelinePlugin, interactionPlugin]}
                        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                        initialView="resourceTimelineMonth"
                        resources={resources}
                        events={events}
                        height="auto"
                        resourceAreaWidth="180px"
                        resourceAreaHeaderContent="Daftar Kamar"
                        slotMinWidth={45}
                        locale="id"
                        headerToolbar={{ 
                            left: 'prev,next today', 
                            center: 'title', 
                            right: 'resourceTimelineMonth,resourceTimelineWeek' 
                        }}
                        views={{
                            resourceTimelineMonth: {
                                buttonText: 'Bulan',
                                slotLabelFormat: { day: 'numeric' }
                            },
                            resourceTimelineWeek: {
                                buttonText: 'Minggu',
                                slotDuration: { days: 1 }, 
                                slotLabelFormat: { weekday: 'short', day: 'numeric' }
                            }
                        }}
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
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><User size={12} /> Nama Lengkap Tamu</label>
                                <input required type="text" placeholder="Nama Tamu" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_name} onChange={e => setNewBooking({ ...newBooking, customer_name: e.target.value })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Globe size={12} /> Sumber Booking (Platform)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {platforms.map((plat) => (
                                        <button key={plat.id} type="button" onClick={() => setNewBooking({ ...newBooking, booking_source: plat.slug })}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${newBooking.booking_source === plat.slug ? 'bg-keenan-gold text-white border-keenan-gold shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-keenan-gold hover:text-keenan-dark'}`}>
                                            {plat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><Phone size={12} /> No. WhatsApp (Opsional)</label>
                                <input type="text" placeholder="Kosongkan jika tidak ada" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_phone} onChange={e => setNewBooking({ ...newBooking, customer_phone: e.target.value })} />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><Mail size={12} /> Email Tamu (Opsional)</label>
                                <input type="email" placeholder="Kosongkan jika tidak ada" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold transition-colors"
                                    value={newBooking.customer_email} onChange={e => setNewBooking({ ...newBooking, customer_email: e.target.value })} />
                            </div>

                            <div className="md:col-span-2 border-t pt-4"></div>

                            {/* PERBAIKAN: PILIH LANGSUNG KE NOMOR KAMAR */}
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Pilih Kamar & Nomor</label>
                                <select required className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold bg-white font-semibold text-gray-700"
                                    value={newBooking.room_type_id && newBooking.assigned_room_number ? `${newBooking.room_type_id}|${newBooking.assigned_room_number}` : ''}
                                    onChange={e => handleRoomSelection(e.target.value)}>
                                    <option value="">-- Pilih Spesifik Nomor Kamar --</option>
                                    {getRoomOptions().map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label} {opt.isMonthly ? '[BULANAN]' : '[HARIAN]'}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Check-In</label>
                                <input required type="date" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold"
                                    value={newBooking.check_in_date} onChange={e => handleCheckInChange(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Check-Out</label>
                                <input required type="date" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold"
                                    value={newBooking.check_out_date} onChange={e => setNewBooking({ ...newBooking, check_out_date: e.target.value })} />
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2">Total Harga Manual (Rp)</label>
                                <input required type="number" className="w-full border-b-2 border-gray-100 p-2 outline-none focus:border-keenan-gold font-black text-lg text-keenan-dark"
                                    value={newBooking.total_price} onChange={e => setNewBooking({ ...newBooking, total_price: parseInt(e.target.value) })} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-keenan-gold uppercase tracking-widest mb-2"><MessageSquare size={12} /> Catatan (Notes)</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-keenan-gold text-sm" rows={2} placeholder="Permintaan khusus atau detail bayar..."
                                    value={newBooking.notes} onChange={e => setNewBooking({ ...newBooking, notes: e.target.value })}></textarea>
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
                                <button type="submit" className={`w-full text-white py-4 rounded-xl font-bold shadow-lg transition-all tracking-widest uppercase text-sm ${availabilityMsg.includes('TERISI') ? 'bg-red-400 hover:bg-red-500' : 'bg-keenan-gold hover:bg-keenan-dark'}`}>
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
                
                /* STYLING KHUSUS UNTUK TIMELINE (GANTT CHART) */
                .fc-datagrid-cell-main { font-weight: bold; font-size: 0.85rem; color: #334155; }
                .fc-timeline-event { border-radius: 6px; font-size: 0.75rem; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: none !important;}
                .fc-resource-group { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; color: #C5A059; letter-spacing: 1px; font-size: 0.75rem; }
            `}</style>
        </div>
    );
}