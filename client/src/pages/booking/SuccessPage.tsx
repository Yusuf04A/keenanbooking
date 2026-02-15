import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, Calendar, MapPin, Download, FileText } from 'lucide-react';

export default function SuccessPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Ambil data dari state yang dikirim BookingPage
    const { booking, pdfUrl } = location.state || {};

    // Jika user akses halaman ini langsung tanpa booking, tampilkan error
    if (!booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <FileText size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h1>
                    <p className="text-sm text-gray-500 mb-6">Sepertinya Anda belum melakukan pemesanan atau halaman di-refresh.</p>
                    <button onClick={() => navigate('/')} className="w-full bg-keenan-dark text-white py-3 rounded-xl font-bold hover:bg-black transition-all">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border border-gray-100">

                {/* --- HEADER (Tema Keenan: Dark & Gold) --- */}
                <div className="bg-keenan-dark p-10 text-center relative overflow-hidden">
                    {/* Hiasan Background */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20 animate-in zoom-in duration-500">
                            <CheckCircle size={40} className="text-keenan-gold" />
                        </div>
                        <h1 className="text-2xl font-bold font-serif text-white tracking-wide">Booking Confirmed!</h1>
                        <p className="text-sm text-gray-400 mt-2">Invoice & Detail telah dikirim ke WhatsApp.</p>
                    </div>
                </div>

                {/* --- BODY CONTENT --- */}
                <div className="p-8 space-y-8">

                    {/* Booking Code */}
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2 font-bold">Booking Reference</p>
                        <p className="text-3xl font-bold text-keenan-gold font-mono tracking-wider">{booking.booking_code}</p>
                    </div>

                    {/* Detail Grid */}
                    <div className="space-y-4 border-t border-dashed border-gray-200 pt-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-keenan-dark shrink-0">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Property</p>
                                <p className="font-bold text-keenan-dark text-sm">Keenan Living Hotel</p>
                                <p className="text-xs text-gray-500 mt-1">{booking.room_types?.name || "Premium Room"}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-keenan-dark shrink-0">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Date</p>
                                <p className="font-bold text-keenan-dark text-sm">
                                    {booking.check_in_date} <span className="text-gray-400 px-1">➔</span> {booking.check_out_date}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="space-y-3 pt-4">
                        <button
                            onClick={() => window.print()}
                            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
                        >
                            <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform">
                                <Download size={14} className="text-gray-600" />
                            </div>
                            Print / Save as PDF
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                        >
                            <Home size={18} /> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}