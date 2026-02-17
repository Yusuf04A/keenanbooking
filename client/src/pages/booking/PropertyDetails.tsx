import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
    MapPin, Users, Wifi, Wind, Coffee, ArrowLeft, Loader2,
    Tv, Car, Utensils, Droplets, MonitorPlay, AlertCircle,
    ChevronDown, ChevronUp, Camera, CheckCircle
} from 'lucide-react';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<any>(null);
    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAllFacilities, setShowAllFacilities] = useState(false);
    const [showAllPropertyFacilities, setShowAllPropertyFacilities] = useState(false);

    // --- DATE & DURATION LOGIC ---
    const today = new Date().toISOString().split('T')[0];
    const [checkIn, setCheckIn] = useState(today);
    const [durationType, setDurationType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [duration, setDuration] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                setProperty(res.data);
                if (res.data.room_types && res.data.room_types.length > 0) {
                    setRoom(res.data.room_types[0]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // Hitung CheckOut otomatis berdasarkan durasi
    const getCheckOutDate = () => {
        const date = new Date(checkIn);
        if (durationType === 'daily') date.setDate(date.getDate() + duration);
        if (durationType === 'weekly') date.setDate(date.getDate() + duration * 7);
        if (durationType === 'monthly') date.setMonth(date.getMonth() + duration);
        return date.toISOString().split('T')[0];
    };

    // Hitung Harga Total
    const getTotalPrice = () => {
        if (!room) return 0;
        let price = room.price_daily;
        if (durationType === 'weekly') price = room.price_weekly || room.price_daily * 7;
        if (durationType === 'monthly') price = room.price_monthly || room.price_daily * 30;
        return price * duration;
    };

    const formatRupiah = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const handleBooking = () => {
        navigate('/booking', {
            state: {
                room,
                propertyName: property.name,
                preSelectedCheckIn: checkIn,
                preSelectedCheckOut: getCheckOutDate(),
                totalPriceOverride: getTotalPrice(),
                durationType,
            },
        });
    };

    // --- ICON FASILITAS ---
    const getFacilityIcon = (facilityName: string) => {
        const f = facilityName.toLowerCase();
        if (f.includes('wifi') || f.includes('internet')) return <Wifi size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('ac') || f.includes('air')) return <Wind size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('break') || f.includes('makan')) return <Coffee size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('tv')) return <Tv size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('netflix')) return <MonitorPlay size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('park')) return <Car size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('kitchen') || f.includes('pantry') || f.includes('dapur')) return <Utensils size={18} className="text-gray-500 shrink-0" />;
        if (f.includes('hot') || f.includes('water') || f.includes('shower')) return <Droplets size={18} className="text-gray-500 shrink-0" />;
        return <CheckCircle size={18} className="text-gray-400 shrink-0" />;
    };

    const durationLabel = durationType === 'daily' ? 'Malam' : durationType === 'weekly' ? 'Minggu' : 'Bulan';

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#FEFBF3]">
            <Loader2 className="animate-spin text-keenan-gold" size={40} />
        </div>
    );

    if (!property || !room) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#FEFBF3] text-center p-4">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Data tidak lengkap</h1>
            <p className="text-gray-500 mb-6">Properti atau kamar tidak ditemukan.</p>
            <button onClick={() => navigate('/')} className="bg-keenan-dark text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-black transition-all">
                Back to Home
            </button>
        </div>
    );

    const visibleRoomFacilities = showAllFacilities ? room.facilities : room.facilities?.slice(0, 4);
    const allPropertyFacilities = [...new Set((property.room_types || []).flatMap((r: any) => r.facilities || []))] as string[];
    const visiblePropertyFacilities = showAllPropertyFacilities ? allPropertyFacilities : allPropertyFacilities.slice(0, 9);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">

            {/* --- TOP NAV --- */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="container mx-auto max-w-7xl">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-600 hover:text-keenan-dark transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Properties</span>
                    </button>
                </div>
            </div>

            {/* --- PHOTO GRID --- */}
            <div className="container mx-auto max-w-7xl px-6 py-6">
                <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
                    {/* Main large photo */}
                    <div className="col-span-2 row-span-2 overflow-hidden">
                        <img
                            src={property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"}
                            alt={property.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    {/* Secondary photos */}
                    {[
                        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070",
                        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070",
                        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
                        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070",
                    ].map((img, idx) => (
                        <div key={idx} className="relative overflow-hidden group">
                            <img
                                src={img}
                                alt={`View ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {idx === 3 && (
                                <button className="absolute bottom-3 right-3 bg-black/80 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 hover:bg-black transition-colors">
                                    <Camera size={12} />
                                    Show all photos
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- PROPERTY TITLE --- */}
            <div className="container mx-auto max-w-7xl px-6 pb-6">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{property.name}</h1>
                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    {property.address}
                </p>
            </div>

            {/* --- SEARCH BAR (gold background) --- */}
            <div className="bg-[#F5E6C8] py-10">
                <div className="container mx-auto max-w-7xl px-6">
                    <div className="bg-white flex flex-col md:flex-row overflow-hidden max-w-4xl mx-auto shadow-sm">

                        {/* Check In */}
                        <div className="flex-1 px-6 py-4 border-b md:border-b-0 md:border-r border-gray-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Check-In</p>
                            <input
                                type="date"
                                value={checkIn}
                                min={today}
                                onChange={e => setCheckIn(e.target.value)}
                                className="text-sm font-medium text-gray-800 outline-none bg-transparent w-full cursor-pointer"
                            />
                        </div>

                        {/* Tipe Durasi */}
                        <div className="flex-1 px-6 py-4 border-b md:border-b-0 md:border-r border-gray-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Tipe Durasi</p>
                            <div className="flex gap-1">
                                {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => { setDurationType(type); setDuration(1); }}
                                        className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all border ${
                                            durationType === type
                                                ? 'bg-keenan-gold text-white border-keenan-gold'
                                                : 'text-gray-400 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {type === 'daily' ? 'Harian' : type === 'weekly' ? 'Mingguan' : 'Bulanan'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jumlah Durasi */}
                        <div className="flex-1 px-6 py-4 border-b md:border-b-0 md:border-r border-gray-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                Jumlah {durationLabel}
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setDuration(Math.max(1, duration - 1))}
                                    className="w-7 h-7 rounded bg-gray-100 font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center leading-none"
                                >−</button>
                                <span className="font-bold text-gray-800 text-sm w-4 text-center">{duration}</span>
                                <button
                                    onClick={() => setDuration(duration + 1)}
                                    className="w-7 h-7 rounded bg-gray-100 font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center leading-none"
                                >+</button>
                            </div>
                        </div>

                        {/* Check Out (readonly) */}
                        <div className="flex-1 px-6 py-4 border-b md:border-b-0 md:border-r border-gray-200">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Check-Out</p>
                            <p className="text-sm font-medium text-gray-800">
                                {new Date(getCheckOutDate()).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </p>
                        </div>

                        {/* Find Rooms */}
                        <button
                            onClick={handleBooking}
                            className="bg-keenan-gold hover:bg-keenan-dark text-white px-8 py-4 font-bold uppercase tracking-widest text-xs transition-colors min-w-[130px]"
                        >
                            FIND ROOMS
                        </button>
                    </div>
                </div>
            </div>

            {/* --- ROOM & RATES --- */}
            <div className="bg-[#FEFBF3] py-12">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Room &amp; Rates</h2>
                    <p className="text-gray-400 text-sm mb-8">Your trip summary</p>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow">

                        {/* Room Image */}
                        <div className="md:w-64 h-56 md:h-auto relative shrink-0 overflow-hidden group">
                            <img
                                src={room.image_url || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"}
                                alt={room.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <button className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 text-white px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap hover:bg-black transition-colors">
                                Show all photos
                            </button>
                        </div>

                        {/* Room Details */}
                        <div className="flex-1 p-6 flex flex-col justify-between">
                            <div>
                                {/* Name & Stock Badge */}
                                <div className="flex items-start justify-between mb-1">
                                    <h3 className="text-xl font-serif font-bold text-gray-900">{room.name}</h3>
                                    {room.total_stock > 0 ? (
                                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-bold uppercase tracking-wide whitespace-nowrap ml-3">
                                            🔥 {room.total_stock} Unit Tersisa
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase tracking-wide ml-3">
                                            Fully Booked
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-400 text-xs mb-4 flex items-center gap-1.5">
                                    <Users size={12} />
                                    {room.capacity} Guest{room.capacity > 1 ? 's' : ''}
                                </p>

                                {/* Facilities */}
                                {room.facilities && room.facilities.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-3">Facilities:</p>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
                                            {visibleRoomFacilities.map((fac: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                                    {getFacilityIcon(fac)}
                                                    <span className="line-clamp-1 max-w-[130px]">{fac}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {room.facilities.length > 4 && (
                                            <button
                                                onClick={() => setShowAllFacilities(!showAllFacilities)}
                                                className="text-xs text-keenan-gold underline font-medium flex items-center gap-1 mt-1 hover:text-keenan-dark transition-colors"
                                            >
                                                {showAllFacilities
                                                    ? <><ChevronUp size={12} /> Hide facilities</>
                                                    : <><ChevronDown size={12} /> Show all facilities</>
                                                }
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price & Book */}
                        <div className="shrink-0 p-6 flex flex-col items-end justify-between border-t md:border-t-0 md:border-l border-gray-100 md:min-w-[200px]">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                                    {duration} {durationLabel}
                                </p>
                                <p className="text-2xl font-bold font-serif text-gray-900">
                                    {formatRupiah(getTotalPrice())}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {formatRupiah(room.price_daily)} / malam
                                </p>
                            </div>

                            <button
                                onClick={handleBooking}
                                disabled={room.total_stock === 0}
                                className="mt-4 bg-keenan-gold hover:bg-keenan-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 font-bold uppercase text-xs tracking-widest transition-colors text-center min-w-[120px]"
                            >
                                BOOK<br />NOW
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ABOUT SECTION --- */}
            <div className="bg-white py-12">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">About {property.name}</h2>
                    <p className="text-gray-600 leading-relaxed text-sm text-justify">
                        {property.description || "At Keenan Living, we believe that a great stay begins with thoughtful details, personalized service, and a space that truly feels like home. As a hospitality brand built around comfort, convenience, and care, we are committed to offering more than just a place to stay — we create experiences that leave a lasting impression."}
                    </p>
                </div>
            </div>

            {/* --- FACILITIES SECTION --- */}
            {allPropertyFacilities.length > 0 && (
                <div className="bg-white py-10 border-t border-gray-100">
                    <div className="container mx-auto max-w-7xl px-6">
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Facilities</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12">
                            {visiblePropertyFacilities.map((fac, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-700 py-4 border-b border-gray-100">
                                    {getFacilityIcon(fac)}
                                    <span>{fac}</span>
                                </div>
                            ))}
                        </div>
                        {allPropertyFacilities.length > 9 && (
                            <button
                                onClick={() => setShowAllPropertyFacilities(!showAllPropertyFacilities)}
                                className="mt-6 text-sm text-keenan-gold underline font-medium flex items-center gap-1 hover:text-keenan-dark transition-colors"
                            >
                                {showAllPropertyFacilities
                                    ? <><ChevronUp size={14} /> Tampilkan lebih sedikit</>
                                    : <><ChevronDown size={14} /> Tampilkan semua fasilitas</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- LOCATION / MAP --- */}
            <div className="bg-white py-12 border-t border-gray-100">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Location</h2>
                    <p className="text-gray-500 text-sm mb-6 flex items-center gap-1.5">
                        <MapPin size={14} className="text-red-500 shrink-0" />
                        {property.address}
                    </p>
                    <div className="rounded-lg overflow-hidden border border-gray-200 h-72 relative group cursor-pointer">
                        <img
                            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            alt="Map"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="bg-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-gray-50">
                                <MapPin size={14} className="text-red-500" />
                                View on Google Maps
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PropertyDetails;