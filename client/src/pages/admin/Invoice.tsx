import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, Download } from 'lucide-react';

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
        } catch (error) {
            console.error('Error fetching invoice:', error);
            alert('Data booking tidak ditemukan atau Anda tidak memiliki akses.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        window.open(`http://127.0.0.1:8000/api/bookings/${id}/invoice-pdf`, '_blank');
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="animate-spin" /> Loading Invoice...
        </div>
    );
    if (!booking) return (
        <div className="h-screen flex items-center justify-center text-gray-500">
            Data tidak ditemukan.
        </div>
    );

    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));
    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <>
            {/* ============================================================
                PRINT STYLES — override semua agar invoice pas di kertas A4
                ============================================================ */}
            <style>{`
                @media print {
                    /* Sembunyikan semua kecuali #invoice-root */
                    body > *:not(#invoice-root) { display: none !important; }
                    #invoice-root { display: block !important; }

                    /* Reset margin & ukuran halaman */
                    @page {
                        size: A4 portrait;
                        margin: 12mm 14mm;
                    }

                    /* Pastikan body tidak punya background abu-abu */
                    body, html {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* Wrapper invoice */
                    #invoice-paper {
                        box-shadow: none !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border-radius: 0 !important;
                        page-break-inside: avoid;
                    }

                    /* Setiap section tidak boleh terpotong di tengah */
                    .inv-section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    /* Tombol print disembunyikan */
                    .no-print { display: none !important; }

                    /* Warna keenan-gold tetap kelihatan di print */
                    .text-keenan-gold { color: #C5A059 !important; }
                    .border-keenan-gold { border-color: #C5A059 !important; }
                }
            `}</style>

            {/* ============================================================
                WRAPPER FULL PAGE
                ============================================================ */}
            <div id="invoice-root" className="bg-gray-100 min-h-screen py-10 px-4 print:bg-white print:py-0 print:px-0">

                {/* Tombol Print (hilang saat print) */}
                <div className="no-print max-w-2xl mx-auto mb-5 flex justify-end">
                    <button
                        onClick={handleDownload}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-colors shadow text-sm"
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>

                {/* ======================================================
                    KERTAS INVOICE — lebar A4 ±794px, padding pas
                    ====================================================== */}
                <div
                    id="invoice-paper"
                    className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden"
                    style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
                >
                    {/* ---- STRIPE ATAS ---- */}
                    <div className="h-2 bg-gray-900" />

                    <div className="p-10">

                        {/* ---- HEADER ---- */}
                        <div className="inv-section flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">INVOICE</h1>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">#{booking.booking_code}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-keenan-gold uppercase tracking-widest">KEENAN LIVING</p>
                                <p className="text-xs text-gray-400 mt-1 leading-snug max-w-[180px] ml-auto">
                                    {booking.property?.address || 'Yogyakarta, Indonesia'}
                                </p>
                            </div>
                        </div>

                        {/* ---- INFO TAMU & TANGGAL ---- */}
                        <div className="inv-section grid grid-cols-2 gap-6 mb-8">
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Billed To</p>
                                <p className="font-bold text-gray-900 text-sm">{booking.customer_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{booking.customer_email}</p>
                                <p className="text-xs text-gray-500">{booking.customer_phone}</p>
                            </div>
                            <div className="text-right">
                                <div className="mb-4">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Booking Date</p>
                                    <p className="font-bold text-gray-900 text-sm">{fmtDate(booking.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Method</p>
                                    <p className="font-bold text-gray-900 text-sm uppercase">{booking.payment_method || 'Virtual Account'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ---- TABEL ITEM ---- */}
                        <div className="inv-section mb-6">
                            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                        <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                        <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Period</th>
                                        <th className="text-center py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Nights</th>
                                        <th className="text-right py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td className="py-4 align-top">
                                            <p className="font-bold text-gray-900">{booking.property?.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{booking.room_type?.name || booking.room_types?.name}</p>
                                        </td>
                                        <td className="py-4 align-top text-xs text-gray-600">
                                            {new Date(booking.check_in_date).toLocaleDateString('id-ID')}<br />
                                            <span className="text-gray-400">s/d</span><br />
                                            {new Date(booking.check_out_date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="py-4 text-center font-semibold text-gray-700 align-top">{nights}</td>
                                        <td className="py-4 text-right font-bold text-gray-900 align-top">{fmt(booking.total_price)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ---- SUBTOTAL & TOTAL ---- */}
                        <div className="inv-section flex justify-end mb-8">
                            <div className="w-full max-w-xs">
                                <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-semibold text-gray-800">{fmt(booking.total_price)}</span>
                                </div>
                                <div className="flex justify-between py-2 text-sm border-b border-gray-100">
                                    <span className="text-gray-500">Tax & Service</span>
                                    <span className="font-semibold text-gray-800">Included</span>
                                </div>
                                <div className="flex justify-between py-3 mt-1 rounded-lg bg-gray-50 px-3">
                                    <span className="font-black text-gray-900 text-sm">TOTAL PAID</span>
                                    <span className="font-black text-keenan-gold text-sm">{fmt(booking.total_price)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ---- STATUS BADGE ---- */}
                        <div className="inv-section mb-8">
                            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                LUNAS / PAID
                            </div>
                        </div>

                        {/* ---- FOOTER ---- */}
                        <div className="inv-section border-t border-gray-100 pt-6 text-center">
                            <p className="text-xl font-serif italic text-gray-300 mb-2">Thank You!</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-widest leading-relaxed">
                                Dokumen ini diterbitkan secara otomatis oleh sistem dan sah tanpa tanda tangan basah.<br />
                                Keenan Living Management System &copy; {new Date().getFullYear()}
                            </p>
                        </div>

                    </div>

                    {/* ---- STRIPE BAWAH ---- */}
                    <div className="h-1.5 bg-keenan-gold" />
                </div>

            </div>
        </>
    );
}