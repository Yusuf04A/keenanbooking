import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Printer } from 'lucide-react';

export default function InvoicePage() {
    const { id } = useParams();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookingDetail();
    }, []);

    const fetchBookingDetail = async () => {
        const { data, error } = await supabase
            .from('bookings')
            .select(`*, room_types(name), properties(name, address)`)
            .eq('id', id)
            .single();

        if (error) {
            alert("Data booking tidak ditemukan");
        } else {
            setBooking(data);
            // Otomatis print setelah data muncul (kasih delay dikit biar rendering selesai)
            setTimeout(() => {
                window.print();
            }, 1000);
        }
        setLoading(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /> Loading Invoice...</div>;
    if (!booking) return <div>Data tidak ditemukan.</div>;

    // Hitung durasi menginap
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));

    return (
        <div className="bg-gray-100 min-h-screen p-8 print:bg-white print:p-0">
            {/* Tombol Print (Akan hilang saat diprint) */}
            <div className="max-w-3xl mx-auto mb-6 flex justify-end print:hidden">
                <button onClick={() => window.print()} className="bg-keenan-dark text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black">
                    <Printer size={18} /> CETAK SEKARANG
                </button>
            </div>

            {/* KERTAS INVOICE */}
            <div className="max-w-3xl mx-auto bg-white p-12 shadow-xl print:shadow-none print:w-full">

                {/* HEADER */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-8 mb-8">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-gray-900">INVOICE</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Receipt #{booking.booking_code}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-keenan-gold uppercase">KEENAN LIVING</h2>
                        <p className="text-sm text-gray-500 max-w-[200px] leading-tight mt-1">
                            {booking.properties?.address || 'Yogyakarta, Indonesia'}
                        </p>
                    </div>
                </div>

                {/* INFO TAMU & TANGGAL */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billed To:</p>
                        <p className="font-bold text-lg">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.customer_email}</p>
                        <p className="text-sm text-gray-600">{booking.customer_phone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Booking Date:</p>
                        <p className="font-bold">{new Date(booking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 mt-4">Payment Method:</p>
                        <p className="font-bold uppercase">{booking.payment_method || 'Virtual Account'}</p>
                    </div>
                </div>

                {/* TABEL ITEM */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Description</th>
                            <th className="text-center py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Nights</th>
                            <th className="text-right py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        <tr className="border-b border-gray-50">
                            <td className="py-4">
                                <p className="font-bold">{booking.room_types?.name}</p>
                                <p className="text-xs text-gray-500">
                                    Check-In: {new Date(booking.check_in_date).toLocaleDateString('id-ID')} <br />
                                    Check-Out: {new Date(booking.check_out_date).toLocaleDateString('id-ID')}
                                </p>
                            </td>
                            <td className="py-4 text-center font-medium">{nights} Malam</td>
                            <td className="py-4 text-right font-bold">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* TOTAL */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm">Subtotal</span>
                            <span className="font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm">Tax & Service (Included)</span>
                            <span className="font-bold">Rp 0</span>
                        </div>
                        <div className="flex justify-between py-4 text-xl">
                            <span className="font-black text-gray-900">TOTAL PAIDTH</span>
                            <span className="font-black text-keenan-gold">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(booking.total_price)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="text-center border-t border-gray-100 pt-8">
                    <p className="text-2xl font-serif font-bold italic text-gray-300 mb-4">Thank You!</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        Keenan Living Management System<br />
                        Generated on {new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}