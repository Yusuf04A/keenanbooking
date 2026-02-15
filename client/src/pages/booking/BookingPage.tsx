import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Loader2, Calendar, User, Info, AlertCircle, CheckCircle,
    ShieldCheck, Wifi, Wind, Coffee, MessageSquare, Star,
    Printer, Home, Check
} from 'lucide-react';

export default function BookingPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const { room, propertyName, preSelectedCheckIn, preSelectedCheckOut } = location.state || {};

    const [loading, setLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'available' | 'unavailable'>('idle');

    // STATE BARU: Untuk menyimpan data sukses (Step 3)
    const [successData, setSuccessData] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '',
        checkIn: preSelectedCheckIn || '',
        checkOut: preSelectedCheckOut || '',
        notes: ''
    });

    useEffect(() => {
        if (!room) {
            alert("Silakan pilih kamar terlebih dahulu.");
            navigate('/');
        }
        if (formData.checkIn && formData.checkOut) {
            checkAvailability(formData.checkIn, formData.checkOut);
        }
    }, [room, navigate]);

    const handleDateChange = (field: string, value: string) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        if (newData.checkIn && newData.checkOut) {
            checkAvailability(newData.checkIn, newData.checkOut);
        }
    };

    const checkAvailability = async (inDate: string, outDate: string) => {
        setIsChecking(true);
        setAvailabilityStatus('idle');

        try {
            // 1. Ambil Info Stok Kamar ini dulu
            const { data: roomData } = await supabase
                .from('room_types')
                .select('total_stock')
                .eq('id', room.id)
                .single();

            const maxStock = roomData?.total_stock || 1; // Default 1 kalau error

            // 2. Hitung berapa orang yang SUDAH booking di tanggal yang bertabrakan
            const { count, error } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true }) // Cuma butuh jumlahnya (count)
                .eq('room_type_id', room.id)
                .neq('status', 'cancelled') // Yang cancel gak dihitung
                // Rumus Tabrakan Tanggal (Overlap Logic)
                .or(`and(check_in_date.lt.${outDate},check_out_date.gt.${inDate})`);

            if (error) throw error;

            const bookedCount = count || 0;

            console.log(`Stok: ${maxStock}, Terpakai: ${bookedCount}`);

            // 3. Bandingkan
            if (bookedCount >= maxStock) {
                setAvailabilityStatus('unavailable'); // Yah, penuh :(
            } else {
                setAvailabilityStatus('available'); // Masih ada sisa! :)
            }

        } catch (err) {
            console.error("Cek ketersediaan error:", err);
            alert("Gagal mengecek ketersediaan kamar.");
        } finally {
            setIsChecking(false);
        }
    };

    const calculateTotal = () => {
        if (!formData.checkIn || !formData.checkOut) return 0;
        const start = new Date(formData.checkIn);
        const end = new Date(formData.checkOut);
        const nights = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
        return nights > 0 ? nights * room.base_price : 0;
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (availabilityStatus === 'unavailable') return alert("Kamar penuh!");

        setLoading(true);
        try {
            const orderId = `KNA-${Date.now()}`;
            const totalPrice = calculateTotal();

            // 1. Request Token Midtrans
            const response = await fetch('http://localhost:5000/api/midtrans/create-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId, amount: totalPrice,
                    customerDetails: { first_name: formData.name, email: formData.email, phone: formData.phone }
                })
            });
            const data = await response.json();

            // 2. Simpan ke Database
            const { data: bookingData, error } = await supabase.from('bookings').insert([{
                booking_code: orderId,
                property_id: room.property_id,
                room_type_id: room.id,
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                customer_notes: formData.notes,
                check_in_date: formData.checkIn,
                check_out_date: formData.checkOut,
                total_price: totalPrice,
                status: 'pending_payment',
                booking_source: 'website'
            }]).select().single();

            if (error) throw error;

            // 3. Munculkan Snap Payment
            (window as any).snap.pay(data.token, {
                onSuccess: () => {
                    // SUKSES: Jangan redirect, tapi set state successData
                    setSuccessData(bookingData);
                    window.scrollTo(0, 0); // Scroll ke atas biar kelihatan
                },
                onPending: () => {
                    setSuccessData(bookingData);
                    window.scrollTo(0, 0);
                },
                onError: () => alert("Pembayaran Gagal")
            });

        } catch (error: any) {
            alert("Error: " + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!room) return null;

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans pb-20 pt-10">
            <div className="container mx-auto px-4 lg:px-20 max-w-5xl">

                {/* --- STEPPER INDICATOR --- */}
                <div className="flex items-center justify-center gap-4 text-sm font-bold text-gray-400 mb-10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</div>
                        <span className="text-gray-800">Select Room</span>
                    </div>
                    <div className={`w-10 h-[1px] ${successData ? 'bg-green-500' : 'bg-gray-300'}`}></div>

                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${successData ? 'bg-green-500 text-white' : 'bg-keenan-gold text-white'}`}>
                            {successData ? '✓' : '2'}
                        </div>
                        <span className={successData ? 'text-gray-800' : 'text-keenan-dark'}>Details & Payment</span>
                    </div>

                    <div className={`w-10 h-[1px] ${successData ? 'bg-keenan-gold' : 'bg-gray-300'}`}></div>

                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${successData ? 'bg-keenan-gold border-keenan-gold text-white' : 'border-gray-300 text-gray-300'}`}>3</div>
                        <span className={successData ? 'text-keenan-dark' : 'text-gray-300'}>Confirmation</span>
                    </div>
                </div>

                {/* --- LOGIC TAMPILAN: JIKA SUKSES -> TAMPILKAN INVOICE, JIKA BELUM -> TAMPILKAN FORM --- */}
                {successData ? (
                    // --- STEP 3: SUCCESS VIEW (INVOICE) ---
                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center max-w-3xl mx-auto animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={40} strokeWidth={4} />
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-keenan-dark mb-2">Booking Confirmed!</h2>
                        <p className="text-gray-500 mb-8">Terima kasih, pesanan Anda telah kami terima.</p>

                        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-left mb-8">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking Code</p>
                                    <p className="text-xl font-mono font-bold text-keenan-dark">{successData.booking_code}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Paid</p>
                                    <p className="text-xl font-bold text-keenan-gold">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(successData.total_price)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Guest Name</p>
                                    <p className="font-semibold">{successData.customer_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Property</p>
                                    <p className="font-semibold">{propertyName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Room Type</p>
                                    <p className="font-semibold">{room.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-In / Out</p>
                                    <p className="font-semibold text-sm">
                                        {new Date(successData.check_in_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(successData.check_out_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Home size={18} /> Back to Home
                            </button>
                            <button
                                onClick={() => window.open(`/admin/invoice/${successData.id}`, '_blank')}
                                className="px-6 py-3 bg-keenan-dark text-white rounded-xl font-bold hover:bg-black flex items-center gap-2 shadow-lg"
                            >
                                <Printer size={18} /> Print Invoice
                            </button>
                        </div>
                    </div>

                ) : (
                    // --- STEP 2: FORM INPUT & PAYMENT ---
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* FORM KIRI */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-white p-8 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
                                <h2 className="text-xl font-serif font-bold text-keenan-dark mb-6 flex items-center gap-2">
                                    <User className="text-keenan-gold" size={20} /> Guest Information
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                        <input required type="text" placeholder="Sesuai KTP / Paspor"
                                            className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold/20 transition-all font-semibold text-gray-700"
                                            onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                            <input required type="email" placeholder="example@mail.com" className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold/20 transition-all"
                                                onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp Number</label>
                                            <input required type="tel" placeholder="0812..." className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold/20 transition-all"
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100">
                                <h2 className="text-xl font-serif font-bold text-keenan-dark mb-6 flex items-center gap-2">
                                    <Calendar className="text-keenan-gold" size={20} /> Stay Details
                                </h2>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-In</label>
                                        <input type="date" className="w-full bg-transparent font-bold text-gray-800 outline-none"
                                            value={formData.checkIn} onChange={e => handleDateChange('checkIn', e.target.value)} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-Out</label>
                                        <input type="date" className="w-full bg-transparent font-bold text-gray-800 outline-none"
                                            value={formData.checkOut} onChange={e => handleDateChange('checkOut', e.target.value)} />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        <span className="flex items-center gap-2"><MessageSquare size={12} /> Special Requests (Optional)</span>
                                    </label>
                                    <textarea
                                        className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-keenan-gold/20 transition-all text-sm min-h-[100px]"
                                        placeholder="Contoh: Saya akan check-in larut malam, tolong siapkan extra bantal..."
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                <div>
                                    {isChecking && <p className="text-xs text-gray-400 animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Checking availability...</p>}
                                    {availabilityStatus === 'unavailable' && (
                                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100">
                                            <AlertCircle size={20} />
                                            <div>
                                                <p>KAMAR PENUH / SOLD OUT</p>
                                                <p className="text-xs font-normal opacity-80">Silakan ganti tanggal atau pilih kamar lain.</p>
                                            </div>
                                        </div>
                                    )}
                                    {availabilityStatus === 'available' && (
                                        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 text-sm font-bold border border-green-200">
                                            <CheckCircle size={20} />
                                            <span>Kamar Tersedia. Silakan lanjutkan pembayaran.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RINGKASAN KANAN */}
                        <div className="lg:col-span-5">
                            <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 sticky top-10">
                                <div className="mb-6">
                                    <p className="text-[10px] text-keenan-gold font-bold uppercase tracking-[0.2em] mb-1">{propertyName}</p>
                                    <h3 className="font-serif font-bold text-2xl text-keenan-dark">{room.name}</h3>
                                </div>

                                <div className="rounded-2xl overflow-hidden h-48 mb-6 relative group">
                                    <img src={room.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Room" />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                                        Max {room.capacity} Orang
                                    </div>
                                </div>

                                <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100 overflow-x-auto">
                                    <div className="flex flex-col items-center gap-1 text-gray-400 min-w-[50px]"><Wifi size={18} /> <span className="text-[10px] font-bold">WiFi</span></div>
                                    <div className="flex flex-col items-center gap-1 text-gray-400 min-w-[50px]"><Wind size={18} /> <span className="text-[10px] font-bold">AC</span></div>
                                    <div className="flex flex-col items-center gap-1 text-gray-400 min-w-[50px]"><Coffee size={18} /> <span className="text-[10px] font-bold">B'fast</span></div>
                                    <div className="flex flex-col items-center gap-1 text-gray-400 min-w-[50px]"><Star size={18} /> <span className="text-[10px] font-bold">Luxury</span></div>
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-gray-500">Harga per malam</span>
                                        <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(room.base_price)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-gray-500">Durasi Menginap</span>
                                        <span className="font-semibold">{(new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 3600 * 24) || 0} Malam</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-center text-green-600">
                                        <span className="flex items-center gap-1"><ShieldCheck size={14} /> Taxes & Fees</span>
                                        <span className="font-bold">Included</span>
                                    </div>
                                    <div className="border-t border-dashed pt-4 mt-2 flex justify-between items-end">
                                        <span className="font-black text-gray-900 text-lg">Total</span>
                                        <span className="font-black text-3xl text-keenan-gold">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculateTotal())}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={loading || availabilityStatus !== 'available'}
                                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm tracking-widest uppercase ${availabilityStatus === 'available'
                                        ? 'bg-keenan-dark text-white hover:bg-black hover:scale-[1.02]'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Book Now"}
                                </button>

                                <p className="text-[10px] text-center text-gray-400 mt-4">
                                    Dengan mengklik tombol di atas, Anda menyetujui Syarat & Ketentuan Keenan Living.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}