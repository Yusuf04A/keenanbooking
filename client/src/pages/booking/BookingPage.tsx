import { sendWhatsAppInvoice } from '../../lib/fonnte';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Loader2, Calendar, User, AlertCircle, CheckCircle,
    Wifi, Wind, Coffee, MessageSquare, Star,
    ShieldCheck, ArrowLeft, Mail, Phone, ChevronRight, Tag, Home
} from 'lucide-react';

export default function BookingPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Ambil data dari navigasi sebelumnya
    const state = location.state || {};
    const { room, preSelectedCheckIn, preSelectedCheckOut } = state;
    const propertyName = state.propertyName || "Keenan Living Hotel";

    // Proteksi jika data hilang (misal refresh)
    useEffect(() => {
        if (!room) {
            alert("Data booking hilang karena refresh. Silakan pilih kamar ulang.");
            navigate('/');
        }
    }, [room, navigate]);

    // 2. State Management
    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'available' | 'unavailable'>('idle');

    // HAPUS state successData, karena kita akan redirect ke SuccessPage
    // const [successData, setSuccessData] = useState<any>(null); 

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '',
        checkIn: preSelectedCheckIn || new Date().toISOString().split('T')[0],
        checkOut: preSelectedCheckOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: ''
    });

    // 3. Cek Ketersediaan Awal & Saat Tanggal Berubah
    useEffect(() => {
        if (room && formData.checkIn && formData.checkOut) {
            checkAvailability(formData.checkIn, formData.checkOut);
        }
    }, [formData.checkIn, formData.checkOut, room]);

    const handleDateChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const checkAvailability = async (inDate: string, outDate: string) => {
        if (!room) return;
        setIsChecking(true);
        setAvailabilityStatus('idle');

        try {
            const { data: roomData } = await supabase
                .from('room_types')
                .select('total_stock')
                .eq('id', room.id)
                .single();

            const maxStock = roomData?.total_stock || 1;

            const { count, error } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('room_type_id', room.id)
                .neq('status', 'cancelled')
                .or(`and(check_in_date.lt.${outDate},check_out_date.gt.${inDate})`);

            if (error) throw error;

            const bookedCount = count || 0;
            if (bookedCount >= maxStock) {
                setAvailabilityStatus('unavailable');
            } else {
                setAvailabilityStatus('available');
            }

        } catch (err) {
            console.error("Cek ketersediaan error:", err);
        } finally {
            setIsChecking(false);
        }
    };

    // 4. Hitung Total Harga
    const calculateTotal = () => {
        if (!formData.checkIn || !formData.checkOut) return 0;
        const start = new Date(formData.checkIn);
        const end = new Date(formData.checkOut);
        const diffTime = end.getTime() - start.getTime();
        const nights = Math.ceil(diffTime / (1000 * 3600 * 24));
        return nights > 0 ? nights * room.base_price : room.base_price;
    };

    // 5. Proses Pembayaran
    const handlePayment = async () => {
        if (!formData.name || !formData.phone || !formData.email) {
            return alert("Mohon lengkapi data diri Anda!");
        }
        if (availabilityStatus !== 'available') {
            return alert("Maaf, kamar tidak tersedia di tanggal tersebut.");
        }

        setLoading(true);
        const finalTotalPrice = calculateTotal();

        try {
            const bookingCode = `KNA-${Date.now()}`;
            const response = await fetch('http://localhost:5000/api/midtrans/create-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: bookingCode,
                    amount: finalTotalPrice,
                    customerDetails: {
                        first_name: formData.name,
                        email: formData.email,
                        phone: formData.phone
                    }
                })
            });

            const { token } = await response.json();

            // @ts-ignore
            window.snap.pay(token, {
                onSuccess: async function (result: any) {
                    console.log("Payment Success!", result);
                    const midtransPdf = result.pdf_url || "";

                    try {
                        // 1. Simpan DB
                        const { data: bookingData, error } = await supabase
                            .from('bookings')
                            .insert([{
                                property_id: room.property_id,
                                room_type_id: room.id,
                                booking_code: bookingCode,
                                check_in_date: formData.checkIn,
                                check_out_date: formData.checkOut,
                                total_price: finalTotalPrice,
                                status: 'paid',
                                customer_name: formData.name,
                                customer_email: formData.email,
                                customer_phone: formData.phone,
                                customer_notes: formData.notes,
                                booking_source: 'website',
                                payment_method: result.payment_type
                            }])
                            .select()
                            .single();

                        if (error) throw error;

                        // 2. Kirim WA
                        await sendWhatsAppInvoice(
                            formData.phone,
                            formData.name,
                            bookingCode,
                            propertyName,
                            room.name,
                            formData.checkIn,
                            formData.checkOut,
                            finalTotalPrice,
                            midtransPdf
                        );

                        // 3. REDIRECT KE SUCCESS PAGE (Logika dikembalikan)
                        navigate('/success', {
                            state: {
                                booking: bookingData,
                                pdfUrl: midtransPdf
                            }
                        });

                    } catch (dbError: any) {
                        console.error("Database/WA Error:", dbError);
                        alert("Pembayaran berhasil, namun gagal menyimpan data. Hubungi Admin.");
                    }
                },
                onPending: function () { alert("Menunggu pembayaran..."); },
                onError: function () { alert("Pembayaran gagal!"); },
                onClose: function () { alert('Transaksi dibatalkan.'); }
            });

        } catch (error) {
            console.error(error);
            alert("Gagal memproses pembayaran (Server Error).");
        } finally {
            setLoading(false);
        }
    };

    if (!room) return null;

    return (
        <div className="min-h-screen bg-[#F5F6FA] font-sans text-gray-800">

            {/* --- HEADER (Clean White) --- */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 lg:px-8 max-w-7xl h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800">Booking Confirmation</h1>
                    </div>

                    {/* Stepper Simple */}
                    <div className="hidden md:flex items-center gap-2 text-xs font-medium">
                        <span className="text-gray-400">1. Cari</span>
                        <ChevronRight size={12} className="text-gray-300" />
                        <span className="text-keenan-gold font-bold">2. Booking</span>
                        <ChevronRight size={12} className="text-gray-300" />
                        <span className="text-gray-400">3. Selesai</span>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8 max-w-7xl py-8">

                {/* --- MAIN FORM LAYOUT (Grid System) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN (Formulir) - Lebar 8/12 */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* SECTION 1: Detail Pemesan */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                <User className="text-keenan-gold" size={18} />
                                <h2 className="font-bold text-gray-800 text-lg">Detail Pemesan</h2>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 mb-1.5 ml-1">Nama Lengkap</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Isi sesuai KTP / Paspor / SIM"
                                        className="w-full p-3 bg-white rounded-lg border border-gray-300 focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold outline-none transition-all text-gray-800"
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-400 mt-1 ml-1">Tanpa gelar dan tanda baca.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1.5 ml-1">Nomor Ponsel</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-3.5 flex items-center gap-1 border-r border-gray-300 pr-2">
                                                <span className="text-sm font-bold text-gray-600">+62</span>
                                            </div>
                                            <input
                                                required
                                                type="tel"
                                                placeholder="81234567890"
                                                className="w-full p-3 pl-16 bg-white rounded-lg border border-gray-300 focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold outline-none transition-all text-gray-800"
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 ml-1">E-tiket akan dikirim ke nomor ini.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 mb-1.5 ml-1">Email</label>
                                        <input
                                            required
                                            type="email"
                                            placeholder="contoh@email.com"
                                            className="w-full p-3 bg-white rounded-lg border border-gray-300 focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold outline-none transition-all text-gray-800"
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-400 mt-1 ml-1">Bukti pembayaran akan dikirim ke sini.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Detail Menginap */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                <Home className="text-keenan-gold" size={18} />
                                <h2 className="font-bold text-gray-800 text-lg">Detail Menginap di {propertyName}</h2>
                            </div>

                            <div className="p-6">
                                {/* Preview Kamar */}
                                <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border border-gray-100 rounded-xl bg-gray-50/30">
                                    <img src={room.image_url} className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover" alt="Room" />
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-1">{room.name}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                                            <span className="flex items-center gap-1"><User size={12} /> Max {room.capacity} Tamu</span>
                                            <span className="flex items-center gap-1"><Wifi size={12} /> Wifi</span>
                                            <span className="flex items-center gap-1"><Coffee size={12} /> Breakfast</span>
                                        </div>
                                        <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle size={12} /> Bebas Reschedule
                                        </div>
                                    </div>
                                </div>

                                {/* Date Pickers */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 border border-gray-300 rounded-lg hover:border-keenan-gold transition-colors cursor-pointer relative group">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Check-In</label>
                                        <input type="date" className="w-full bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                                            value={formData.checkIn} onChange={e => handleDateChange('checkIn', e.target.value)} />
                                    </div>
                                    <div className="p-3 border border-gray-300 rounded-lg hover:border-keenan-gold transition-colors cursor-pointer relative group">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Check-Out</label>
                                        <input type="date" className="w-full bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
                                            value={formData.checkOut} onChange={e => handleDateChange('checkOut', e.target.value)} />
                                    </div>
                                </div>

                                {/* Special Request */}
                                <div>
                                    <label className="text-sm font-bold text-gray-500 mb-2 block">Permintaan Khusus (Opsional)</label>
                                    <textarea
                                        className="w-full p-3 bg-white rounded-lg border border-gray-300 focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold outline-none transition-all text-sm resize-none h-24"
                                        placeholder="Misal: Check-in lebih awal, kamar bebas asap rokok..."
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                {/* Availability Status */}
                                <div className="mt-4">
                                    {isChecking && <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Mengecek ketersediaan...</p>}
                                    {availabilityStatus === 'unavailable' && (
                                        <p className="text-sm text-red-500 flex items-center gap-2 font-bold"><AlertCircle size={14} /> Kamar penuh di tanggal ini.</p>
                                    )}
                                    {availabilityStatus === 'available' && !isChecking && (
                                        <p className="text-sm text-green-600 flex items-center gap-2 font-bold"><CheckCircle size={14} /> Kamar tersedia!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Sticky Summary) - Lebar 4/12 */}
                    <div className="lg:col-span-4 sticky top-24 space-y-4">

                        {/* Summary Card */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Rincian Harga</h3>
                                <div className="bg-white px-2 py-1 rounded border border-gray-200 text-xs font-bold text-gray-500">
                                    {(new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 3600 * 24) || 0} Malam
                                </div>
                            </div>

                            <div className="p-5 space-y-3">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Harga Kamar</span>
                                    <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.base_price)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Pajak & Biaya</span>
                                    <span className="font-medium text-green-600">Termasuk</span>
                                </div>

                                <div className="border-t border-dashed border-gray-200 my-2 pt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-gray-800 text-lg">Total Pembayaran</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-2xl text-keenan-gold">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculateTotal())}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50">
                                <button
                                    onClick={handlePayment}
                                    disabled={loading || availabilityStatus !== 'available'}
                                    className={`w-full py-4 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${availabilityStatus === 'available'
                                            ? 'bg-keenan-gold hover:bg-yellow-600'
                                            : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Lanjutkan Pembayaran"}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-3">
                                    Dengan lanjut, Anda setuju dengan S&K Keenan Living.
                                </p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}