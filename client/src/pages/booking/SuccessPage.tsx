import { useLocation, useNavigate } from 'react-router-dom';
import {
    CheckCircle, Home, MapPin, Download,
    FileText, Mail, Phone, ShieldCheck, Clock, User
} from 'lucide-react';

export default function SuccessPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Ambil data dari state navigasi
    const { booking } = location.state || {};

    // Download PDF dari backend Laravel
    const downloadPdf = () => {
        if (!booking?.id) return;
        window.open(`http://127.0.0.1:8000/api/bookings/${booking.id}/invoice-pdf`, '_blank');
    };

    // --- Helper Formatter ---
    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Hitung durasi malam
    const getDuration = () => {
        if (!booking?.check_in_date || !booking?.check_out_date) return 0;
        const start = new Date(booking.check_in_date);
        const end = new Date(booking.check_out_date);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    };

    // --- DATA DINAMIS (PENTING: Ambil dari relasi data) ---
    // Pastikan fallback image ada jika data gambar kosong
    const roomImage = booking?.room_types?.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';
    // Handle nama properti dari berbagai kemungkinan struktur data (property / properties)
    const propertyName = booking?.property?.name || booking?.properties?.name || "Keenan Living Hotel";
    const roomName = booking?.room_types?.name || "Kamar Hotel";

    // --- TAMPILAN ERROR (Jika Data Kosong) ---
    if (!booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-[#F5F6FA]">
                <div className="bg-white p-10 rounded-2xl shadow-lg max-w-md w-full border border-gray-200">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <FileText size={40} />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800 mb-2">
                        Data Tidak Ditemukan
                    </h1>
                    <p className="text-gray-500 mb-8">
                        Maaf, data pemesanan tidak ditemukan. Hal ini bisa terjadi jika halaman dimuat ulang.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-md"
                    >
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F6FA] font-sans">

            {/* TOP BAR */}
            <div className="bg-keenan-dark text-white border-b border-white/10 print:bg-white print:text-black print:border-b-2 print:border-black">
                <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 print:border-black print:text-black">
                                <CheckCircle size={30} className="text-keenan-gold print:text-black" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-wide">
                                    Pembayaran Berhasil!
                                </h1>
                                <p className="text-white/70 text-sm mt-1 print:text-gray-600">
                                    Pesanan Anda telah terkonfirmasi. Simpan bukti booking ini.
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-white/60 print:text-gray-600">
                                    <MapPin size={14} className="text-keenan-gold print:text-black" />
                                    <span>{propertyName} • Yogyakarta, Indonesia</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-start lg:items-end">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/50 print:text-gray-500">
                                Booking Code
                            </p>
                            <p className="text-3xl md:text-4xl font-mono font-bold text-keenan-gold tracking-wider print:text-black">
                                {booking.booking_code}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 no-print">
                        <button
                            onClick={downloadPdf}
                            className="bg-keenan-gold text-keenan-dark font-bold px-6 py-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                            <Download size={18} />
                            Download Invoice PDF
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="bg-white/10 border border-white/20 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Home size={18} />
                            Kembali ke Beranda
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT SIDE (DETAILS) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* SECTION: INFORMASI TAMU */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden print-area">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <User size={16} />
                                    Informasi Pemesan
                                </h2>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-wide print:border print:border-green-600">
                                    Paid
                                </span>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Nama Tamu</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        {booking.customer_name}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Nomor WhatsApp</p>
                                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Phone size={14} className="text-gray-400" />
                                        {booking.customer_phone}
                                    </p>
                                </div>

                                <div className="md:col-span-2">
                                    <p className="text-xs text-gray-400 mb-1">Email</p>
                                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Mail size={14} className="text-gray-400" />
                                        {booking.customer_email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: CHECK IN OUT */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden print-area">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Clock size={16} />
                                    Informasi Waktu Menginap
                                </h2>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-gray-200 rounded-xl p-5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Check-In
                                    </p>
                                    <p className="text-lg font-bold text-gray-800">
                                        {formatDate(booking.check_in_date)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <Clock size={12} className="text-keenan-gold" />
                                        14:00 WIB
                                    </p>
                                </div>

                                <div className="border border-gray-200 rounded-xl p-5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                        Check-Out
                                    </p>
                                    <p className="text-lg font-bold text-gray-800">
                                        {formatDate(booking.check_out_date)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <Clock size={12} className="text-keenan-gold" />
                                        12:00 WIB
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 pb-6">
                                <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium border border-blue-100 print:bg-white print:border-gray-300 print:text-black">
                                    <ShieldCheck size={18} />
                                    <span>Booking Anda dijamin aman dan telah tercatat di sistem.</span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: ROOM INFO */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden print-area">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Home size={16} />
                                    Detail Kamar
                                </h2>
                            </div>

                            <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* GAMBAR DINAMIS DISINI */}
                                <div className="w-full md:w-56 h-40 bg-gray-200 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                                    <img
                                        src={roomImage} // <-- SUDAH DINAMIS
                                        className="w-full h-full object-cover"
                                        alt="Room Image"
                                    />
                                </div>

                                <div className="flex-1">
                                    <p className="text-2xl font-serif font-bold text-keenan-dark">
                                        {roomName}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {getDuration()} Malam • 1 Kamar
                                    </p>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs text-gray-400 mb-1">Hotel</p>
                                            <p className="font-bold text-gray-800">{propertyName}</p>
                                        </div>

                                        <div className="border border-gray-200 rounded-xl p-4">
                                            <p className="text-xs text-gray-400 mb-1">Lokasi</p>
                                            <p className="font-bold text-gray-800 flex items-center gap-2">
                                                <MapPin size={14} className="text-keenan-gold" />
                                                Yogyakarta
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE (PAYMENT SUMMARY) */}
                    <div className="lg:col-span-4">
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-6 print-area">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <FileText size={16} />
                                    Rincian Pembayaran
                                </h2>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Metode Bayar</span>
                                    <span className="font-bold uppercase text-gray-800">
                                        {booking.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Status</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase print:border print:border-green-600">
                                        Lunas
                                    </span>
                                </div>

                                <div className="border-t border-dashed border-gray-300 pt-5 space-y-4">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Harga Kamar</span>
                                        <span className="font-medium text-gray-800">
                                            {formatRupiah(booking.total_price / getDuration())} x {getDuration()} mlm
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Pajak & Layanan</span>
                                        <span className="text-gray-400 font-medium">Termasuk</span>
                                    </div>
                                </div>

                                <div className="border-t-2 border-gray-900 pt-5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-gray-600">
                                            Total Bayar
                                        </span>
                                        <span className="text-2xl font-bold text-keenan-gold print:text-black">
                                            {formatRupiah(booking.total_price)}
                                        </span>
                                    </div>
                                </div>

                                {/* TOMBOL ACTION */}
                                <div className="pt-4">
                                    <button
                                        onClick={downloadPdf}
                                        className="w-full bg-keenan-dark text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md group"
                                    >
                                        <Download size={18} className="group-hover:scale-110 transition-transform" />
                                        Download Invoice PDF
                                    </button>

                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full mt-3 bg-white border border-gray-300 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Home size={18} />
                                        Kembali ke Beranda
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-5 text-center print:bg-white print:border-t-2">
                                <p className="text-xs text-gray-400 leading-relaxed print:text-black">
                                    Bukti pembayaran ini sah dan diterbitkan oleh sistem.<br />
                                    Tunjukkan Booking Code saat Check-in di resepsionis.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}