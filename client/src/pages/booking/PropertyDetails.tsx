import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
    MapPin, Users, Wifi, Wind, Coffee, ArrowLeft, Loader2,
    Tv, Car, Utensils, Droplets, MonitorPlay, Calendar, AlertCircle
} from 'lucide-react';

// Tipe Data Sesuai Database
interface RoomType {
    id: string;
    name: string;
    description: string;
    base_price: number;
    capacity: number;
    image_url: string;
    facilities: string[];
    property_id: string;
    total_stock: number;
}

interface Property {
    id: string;
    name: string;
    address: string;
    description: string;
    image_url: string;
    room_types: RoomType[];
}

const PropertyDetails = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    // --- DATE LOGIC YANG LEBIH PINTAR ---
    // Default: CheckIn hari ini, CheckOut besok
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || today);
    const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || tomorrow);
    const [guests, setGuests] = useState(parseInt(searchParams.get('guests') || '1'));

    useEffect(() => {
        // Validasi Tanggal: CheckOut tidak boleh sebelum CheckIn
        if (checkIn >= checkOut) {
            const nextDay = new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0];
            setCheckOut(nextDay);
        }
    }, [checkIn]);

    useEffect(() => {
        const fetchPropertyDetails = async () => {
            if (!id) return;
            try {
                // Panggil API Laravel
                const response = await api.get(`/properties/${id}`);
                const data = response.data;
                
                setProperty({
                    ...data,
                    room_types: data.room_types || [] // Laravel pakainya snake_case
                });
            } catch (err) {
                console.error("Error fetching property:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPropertyDetails();
    }, [id]);

    // --- FUNGSI SAKTI: MAPPING ICON FASILITAS ---
    const renderFacilityIcon = (facilityName: string) => {
        const f = facilityName.toLowerCase();
        const iconClass = "text-keenan-gold";

        if (f.includes('wifi') || f.includes('internet')) return <div key={f} className="flex items-center gap-2"><Wifi size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('ac') || f.includes('air')) return <div key={f} className="flex items-center gap-2"><Wind size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('break') || f.includes('makan')) return <div key={f} className="flex items-center gap-2"><Coffee size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('tv')) return <div key={f} className="flex items-center gap-2"><Tv size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('netflix')) return <div key={f} className="flex items-center gap-2"><MonitorPlay size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('park')) return <div key={f} className="flex items-center gap-2"><Car size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('kitchen') || f.includes('pantry') || f.includes('dapur')) return <div key={f} className="flex items-center gap-2"><Utensils size={14} className={iconClass} /> {facilityName}</div>;
        if (f.includes('hot') || f.includes('water')) return <div key={f} className="flex items-center gap-2"><Droplets size={14} className={iconClass} /> {facilityName}</div>;

        // Default Icon
        return <div key={f} className="flex items-center gap-2 text-gray-500">✓ {facilityName}</div>;
    };

    const formatRupiah = (price: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    };

    const handleSelectRoom = (room: RoomType) => {
        // Kirim data lengkap ke halaman Booking
        navigate('/booking', {
            state: {
                room: room,
                propertyName: property?.name,
                preSelectedCheckIn: checkIn,   // Tanggal yang sudah dipilih user
                preSelectedCheckOut: checkOut, // Tanggal yang sudah dipilih user
                guests: guests
            }
        });
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FEFBF3]"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    if (!property) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#FEFBF3] text-center p-4">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Property Not Found</h1>
            <p className="text-gray-500 mb-6">Properti yang Anda cari tidak ditemukan atau telah dihapus.</p>
            <button onClick={() => navigate('/')} className="bg-keenan-dark text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-black transition-all">Back to Home</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FEFBF3] font-sans text-gray-800 pb-20">

            {/* --- HEADER IMAGE (HERO) --- */}
            <div className="relative h-[40vh] md:h-[60vh] w-full group overflow-hidden">
                <img
                    src={property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"}
                    alt={property.name}
                    className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Navbar Overlay */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center text-white z-20">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white hover:text-black transition-all">
                        <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                    </button>
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white animate-in slide-in-from-bottom-8 duration-700">
                    <div className="container mx-auto max-w-6xl">
                        <div className="flex items-center gap-2 text-keenan-gold mb-2 font-bold uppercase tracking-widest text-xs">
                            <span className="w-8 h-[2px] bg-keenan-gold"></span> Premium Stay
                        </div>
                        <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4 drop-shadow-lg">{property.name}</h1>
                        <p className="flex items-center text-sm md:text-base opacity-90 font-light max-w-2xl leading-relaxed">
                            <MapPin size={18} className="mr-2 text-keenan-gold shrink-0" /> {property.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- STICKY SEARCH BAR --- */}
            <div className="sticky top-0 z-40 bg-[#FEFBF3]/95 backdrop-blur-md shadow-sm border-b border-gray-200 py-4 px-4 transition-all">
                <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-end md:items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">

                    <div className="flex-1 w-full bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block mb-1 text-[10px] flex items-center gap-1"><Calendar size={10} /> Check In</label>
                        <input type="date" value={checkIn} min={today} onChange={e => setCheckIn(e.target.value)}
                            className="w-full text-sm font-bold text-keenan-dark outline-none bg-transparent font-serif cursor-pointer" />
                    </div>

                    <div className="flex-1 w-full bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block mb-1 text-[10px] flex items-center gap-1"><Calendar size={10} /> Check Out</label>
                        <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)}
                            className="w-full text-sm font-bold text-keenan-dark outline-none bg-transparent font-serif cursor-pointer" />
                    </div>

                    <div className="w-full md:w-40 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block mb-1 text-[10px] flex items-center gap-1"><Users size={10} /> Guests</label>
                        <select value={guests} onChange={e => setGuests(parseInt(e.target.value))}
                            className="w-full text-sm font-bold text-keenan-dark outline-none bg-transparent cursor-pointer">
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Person</option>)}
                        </select>
                    </div>

                    {/* Button Update hanya visual agar user merasa ada aksi */}
                    <button className="bg-keenan-gold text-white px-6 py-4 rounded-xl hover:bg-keenan-dark transition-all shadow-md">
                        Update
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="container mx-auto px-4 py-12 max-w-6xl">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* LEFT COLUMN: DESCRIPTION (2/3) */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Description */}
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark mb-4 border-l-4 border-keenan-gold pl-4">About This Property</h2>
                            <p className="text-gray-600 leading-relaxed text-sm md:text-base text-justify">
                                {property.description || "Rasakan kenyamanan menginap dengan fasilitas lengkap dan pelayanan terbaik. Cocok untuk liburan keluarga maupun perjalanan bisnis Anda. Terletak strategis di pusat kota dengan akses mudah ke berbagai destinasi wisata."}
                            </p>
                        </div>

                        {/* ROOM LIST */}
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark mb-8 flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-gray-400"></span> Available Rooms
                            </h2>

                            {(!property.room_types || property.room_types.length === 0) ? (
                                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-gray-400 italic">Belum ada kamar yang tersedia saat ini.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {property.room_types.map((room) => (
                                        <div key={room.id} className="bg-white rounded-2xl border border-gray-100 flex flex-col md:flex-row overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">

                                            {/* Image Section */}
                                            <div className="md:w-5/12 h-64 md:h-auto relative overflow-hidden">
                                                <img
                                                    src={room.image_url || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"}
                                                    alt={room.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                                    {room.total_stock > 0 ? `${room.total_stock} Unit Left` : 'Fully Booked'}
                                                </div>
                                            </div>

                                            {/* Details Section */}
                                            <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="text-2xl font-serif font-bold text-keenan-dark group-hover:text-keenan-gold transition-colors">{room.name}</h3>
                                                    </div>
                                                    <p className="text-gray-500 text-xs md:text-sm mb-6 line-clamp-2">
                                                        {room.description || "Kamar eksklusif dengan desain modern dan nyaman, dilengkapi perabotan premium."}
                                                    </p>

                                                    {/* Fasilitas */}
                                                    <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Room Amenities</p>
                                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-medium">
                                                            {room.facilities && room.facilities.length > 0 ? (
                                                                room.facilities.slice(0, 6).map(fac => renderFacilityIcon(fac))
                                                            ) : (
                                                                <span className="text-gray-400 italic text-xs">Standard amenities included</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between border-t border-gray-100 pt-6 mt-2">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Price per Night</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-bold text-keenan-gold font-serif">{formatRupiah(room.base_price)}</span>
                                                            <span className="text-xs text-gray-400">/ nett</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleSelectRoom(room)}
                                                        className="bg-keenan-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-keenan-gold hover:shadow-lg transition-all transform active:scale-95"
                                                    >
                                                        Book Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: INFO / MAP (1/3) */}
                    <div className="hidden lg:block">
                        <div className="sticky top-32 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="font-serif font-bold text-lg mb-4 text-keenan-dark">Location</h3>
                                <div className="aspect-video bg-gray-200 rounded-lg mb-4 relative overflow-hidden group cursor-pointer">
                                    <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Map" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="bg-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                                            <MapPin size={14} className="text-red-500" /> View on Map
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {property.address}
                                </p>
                            </div>

                            <div className="bg-keenan-dark text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-keenan-gold/20 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
                                <h3 className="font-serif font-bold text-lg mb-2">Need Help?</h3>
                                <p className="text-xs text-gray-400 mb-4">Hubungi kami jika Anda memiliki pertanyaan.</p>
                                <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-white/10">
                                    Contact Support
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PropertyDetails;