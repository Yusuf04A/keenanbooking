import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, ArrowLeft, Calendar, User, ShieldCheck, Star, Clock } from 'lucide-react';

declare global {
    interface Window {
        snap: any;
    }
}

export default function BookingPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const roomId = searchParams.get('roomId');
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const guests = parseInt(searchParams.get('guests') || '1');

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        title: 'Mr',
        fullName: '',
        email: '',
        phone: '',
        notes: ''
    });

    useEffect(() => {
        const fetchRoom = async () => {
            if (!roomId) return;
            const { data } = await supabase
                .from('room_types')
                .select(`*, properties(name, address)`)
                .eq('id', roomId)
                .single();

            if (data) setRoom(data);
            setLoading(false);
        };
        fetchRoom();
    }, [roomId]);

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = room ? room.base_price * diffDays : 0;

    const handlePayment = async () => {
        if (!formData.fullName || !formData.email || !formData.phone) {
            alert("Mohon lengkapi data Nama, Email, dan No. HP");
            return;
        }

        setProcessing(true);

        try {
            const orderId = `KNA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // 1. Simpan Booking (Status: Pending)
            const { error: dbError } = await supabase.from('bookings').insert({
                booking_code: orderId,
                property_id: room.property_id,
                room_type_id: room.id,
                customer_name: `${formData.title}. ${formData.fullName}`,
                customer_email: formData.email,
                customer_phone: formData.phone,
                customer_notes: formData.notes,
                check_in_date: checkIn,
                check_out_date: checkOut,
                total_guests: guests,
                total_price: totalPrice,
                status: 'pending_payment'
            });

            if (dbError) throw dbError;

            // 2. Minta Token Payment
            const response = await fetch(`${import.meta.env.VITE_API_URL}/midtrans/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    gross_amount: totalPrice,
                    customer_details: {
                        first_name: formData.fullName,
                        email: formData.email,
                        phone: formData.phone
                    },
                    item_details: [{
                        id: room.id,
                        price: totalPrice,
                        quantity: 1,
                        name: `${room.name} (${diffDays} Malam)`
                    }]
                })
            });

            const data = await response.json();

            // 3. Munculkan Snap Popup
            if (window.snap) {
                window.snap.pay(data.token, {
                    onSuccess: () => {
                        // Nanti kita arahkan ke halaman Success
                        alert("Pembayaran Berhasil! Email konfirmasi akan dikirim.");
                        navigate('/');
                    },
                    onPending: () => {
                        alert("Menunggu Pembayaran...");
                        navigate('/');
                    },
                    onError: () => {
                        alert("Pembayaran Gagal/Dibatalkan");
                        setProcessing(false);
                    },
                    onClose: () => {
                        setProcessing(false);
                    }
                });
            }

        } catch (error: any) {
            alert("Error: " + error.message);
            setProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-keenan-cream text-keenan-gold"><Loader2 className="animate-spin mr-2" /> Menyiapkan halaman...</div>;
    if (!room) return <div className="p-10 text-center">Data kamar tidak valid.</div>;

    return (
        <div className="min-h-screen bg-keenan-cream font-sans text-keenan-dark pb-20">

            {/* Navbar Minimalis */}
            <div className="bg-white/80 backdrop-blur-md border-b border-keenan-gold/20 sticky top-0 z-10 px-4 py-4">
                <div className="container mx-auto flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="hover:bg-keenan-cream p-2 rounded-full transition-colors text-keenan-gold">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-serif font-bold text-xl tracking-wide">Secure Booking</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- KOLOM KIRI: FORM --- */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Banner Login */}
                    <div className="bg-keenan-dark text-keenan-cream p-4 rounded-lg flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="bg-keenan-gold p-2 rounded-full text-white"><User size={20} /></div>
                            <div>
                                <p className="text-sm font-bold">Booking sebagai Tamu</p>
                                <p className="text-xs opacity-80">Login untuk akses promo khusus member.</p>
                            </div>
                        </div>
                        {/* <button className="text-xs font-bold underline text-keenan-gold">LOGIN</button> */}
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border-t-4 border-keenan-gold">
                        <h2 className="font-serif font-bold text-2xl mb-2 flex items-center gap-2">
                            Data Pemesan <span className="text-red-500 text-sm">*</span>
                        </h2>
                        <p className="text-gray-400 text-sm mb-6 border-b pb-4">Pastikan data sesuai dengan kartu identitas (KTP/Paspor).</p>

                        <div className="space-y-5">
                            {/* Nama */}
                            <div>
                                <label className="block text-xs font-bold text-keenan-gold uppercase tracking-widest mb-2">Nama Lengkap</label>
                                <div className="flex gap-3">
                                    <select
                                        className="border border-gray-300 p-3 rounded bg-gray-50 outline-none focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    >
                                        <option value="Mr">Mr.</option>
                                        <option value="Mrs">Mrs.</option>
                                        <option value="Ms">Ms.</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Cth. Yusuf Aditya"
                                        className="flex-1 border border-gray-300 p-3 rounded outline-none focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold bg-white"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Kontak */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-keenan-gold uppercase tracking-widest mb-2">Email Aktif</label>
                                    <input
                                        type="email"
                                        placeholder="email@contoh.com"
                                        className="w-full border border-gray-300 p-3 rounded outline-none focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold bg-white"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">E-Voucher akan dikirim ke sini.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-keenan-gold uppercase tracking-widest mb-2">WhatsApp / HP</label>
                                    <input
                                        type="tel"
                                        placeholder="08..."
                                        className="w-full border border-gray-300 p-3 rounded outline-none focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold bg-white"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Permintaan Khusus (Opsional)</label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-300 p-3 rounded outline-none focus:border-keenan-gold focus:ring-1 focus:ring-keenan-gold bg-white text-sm"
                                    placeholder="Cth. Check-in terlambat, kamar bebas asap rokok..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold text-lg tracking-widest hover:bg-keenan-gold transition-all shadow-xl flex justify-center items-center gap-2 transform active:scale-95 duration-200"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : "LANJUT KE PEMBAYARAN"}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ShieldCheck size={14} /> Transaksi Anda dilindungi enkripsi 256-bit SSL.
                    </div>
                </div>

                {/* --- KOLOM KANAN: RINGKASAN --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-24">
                        <div className="h-40 relative">
                            <img src={room.image_url} className="w-full h-full object-cover" alt="Room" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <p className="text-xs opacity-90 mb-1 flex items-center gap-1"><Star size={10} fill="currentColor" className="text-keenan-gold" /> Keenan Living</p>
                                <h3 className="font-serif font-bold text-xl">{room.name}</h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start gap-3 mb-6">
                                <div className="bg-keenan-cream p-2 rounded">
                                    <Clock size={20} className="text-keenan-gold" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-keenan-dark">{room.properties?.name}</p>
                                    <p className="text-xs text-gray-500">{room.properties?.address || 'Yogyakarta'}</p>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-dashed border-gray-200 pt-4 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Check-In</span>
                                    <span className="font-bold">{new Date(checkIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Check-Out</span>
                                    <span className="font-bold">{new Date(checkOut).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Durasi</span>
                                    <span className="font-bold">{diffDays} Malam</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tamu</span>
                                    <span className="font-bold">{guests} Orang</span>
                                </div>
                            </div>

                            <div className="bg-keenan-cream p-4 rounded-lg border border-keenan-gold/30">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-600 text-sm">Total Harga</span>
                                    <span className="font-bold text-xl text-keenan-dark">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalPrice)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 text-right">Termasuk pajak & biaya layanan</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}