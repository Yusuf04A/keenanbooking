import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api'; // <--- GANTI IMPORT SUPABASE KE API LARAVEL
import { Loader2, Printer } from 'lucide-react';

export default function InvoicePage() {
    const { id } = useParams();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookingDetail();
    }, []);

    const fetchBookingDetail = async () => {
        try {
            const response = await api.get(`/bookings/${id}`);

            setBooking(response.data);

            // Otomatis print setelah data muncul
            setTimeout(() => {
                window.print();
            }, 1000);

        } catch (error) {
            console.error("Error fetching invoice:", error);
            alert("Data booking tidak ditemukan atau Anda tidak memiliki akses.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /> Loading Invoice...</div>;
    if (!booking) return <div className="h-screen flex items-center justify-center">Data tidak ditemukan.</div>;

    // Hitung durasi menginap
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    // Hitung malam, minimal 1 malam jika check-in/out di hari sama (untuk hourly)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));

    return (
        <div className="bg-gray-100 min-h-screen p-8 print:bg-white print:p-0">
            {/* Tombol Print (Akan hilang saat diprint) */}
            <div className="max-w-3xl mx-auto mb-6 flex justify-end print:hidden">
                <button onClick={() => window.print()} className="bg-keenan-dark text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-colors">
                    <Printer size={18} /> CETAK SEKARANG
                </button>
            </div>

            {/* KERTAS INVOICE */}
            <div className="max-w-3xl mx-auto bg-white p-12 shadow-xl print:shadow-none print:w-full print:max-w-none">

                {/* HEADER (Hindari terpotong dengan break-inside-avoid) */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-8 mb-8 print:break-inside-avoid">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-gray-900">INVOICE</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Receipt #{booking.booking_code}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-keenan-gold uppercase">KEENAN LIVING</h2>
                        <p className="text-sm text-gray-500 max-w-[200px] leading-tight mt-1 ml-auto">
                            {booking.property?.address || 'Yogyakarta, Indonesia'}
                        </p>
                    </div>
                </div>

                {/* INFO TAMU & TANGGAL (Hindari terpotong) */}
                <div className="grid grid-cols-2 gap-8 mb-10 print:break-inside-avoid">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billed To:</p>
                        <p className="font-bold text-lg text-gray-900">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.customer_email}</p>
                        <p className="text-sm text-gray-600">{booking.customer_phone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Booking Date:</p>
                        <p className="font-bold text-gray-900">{new Date(booking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 mt-4">Payment Method:</p>
                        <p className="font-bold uppercase text-gray-900">{booking.payment_method || 'Virtual Account'}</p>
                    </div>
                </div>

                {/* TABEL ITEM (Hindari isi tabel terpotong per barisnya) */}
                <div className="mb-8 print:break-inside-avoid">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="text-left py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Description</th>
                                <th className="text-center py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Nights</th>
                                <th className="text-right py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            <tr className="border-b border-gray-50 print:break-inside-avoid">
                                <td className="py-4">
                                    <p className="font-bold text-gray-900">{booking.room_type?.name || booking.room_types?.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Check-In: {new Date(booking.check_in_date).toLocaleDateString('id-ID')} <br />
                                        Check-Out: {new Date(booking.check_out_date).toLocaleDateString('id-ID')}
                                    </p>
                                </td>
                                <td className="py-4 text-center font-medium">{nights} Malam</td>
                                <td className="py-4 text-right font-bold text-gray-900">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* TOTAL DAN RINCIAN (Hindari terpotong) */}
                <div className="flex justify-end mb-12 print:break-inside-avoid">
                    <div className="w-full md:w-1/2">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm">Subtotal</span>
                            <span className="font-bold text-gray-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm">Tax & Service (Included)</span>
                            <span className="font-bold text-gray-900">Rp 0</span>
                        </div>
                        <div className="flex justify-between py-4 text-xl mt-2">
                            <span className="font-black text-gray-900">TOTAL PAID</span>
                            <span className="font-black text-keenan-gold">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* FOOTER (Hindari terpotong) */}
                <div className="text-center border-t border-gray-100 pt-8 mt-10 print:break-inside-avoid">
                    <p className="text-2xl font-serif font-bold italic text-gray-300 mb-4">Thank You!</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed">
                        Bukti pembayaran ini sah dan diterbitkan oleh sistem.<br />
                        Keenan Living Management System &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}