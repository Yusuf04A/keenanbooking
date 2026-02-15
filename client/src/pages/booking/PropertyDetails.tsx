import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    MapPin, Users, Wifi, Wind, Coffee, ArrowLeft, Loader2,
    Tv, Car, Utensils, Droplets, MonitorPlay
} from 'lucide-react';

// Tipe Data
interface RoomType {
    id: string;
    name: string;
    description: string;
    base_price: number;
    capacity: number;
    image_url: string;
    facilities: string[]; // <--- Ini Array dari Database
    property_id: string;
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
    const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || new Date().toISOString().split('T')[0]);
    const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [guests, setGuests] = useState(parseInt(searchParams.get('guests') || '1'));

    useEffect(() => {
        const fetchPropertyDetails = async () => {
            if (!id) return;
            try {
                // Ambil Data Property + Room Types
                const { data, error } = await supabase
                    .from('properties')
                    .select(`*, room_types (*)`)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProperty(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPropertyDetails();
    }, [id]);

    // --- FUNGSI SAKTI: UBAH TEXT JADI ICON ---
    // Ini kuncinya biar fasilitas sinkron sama Superadmin
    const renderFacilityIcon = (facilityName: string) => {
        const f = facilityName.toLowerCase();

        // Mapping Nama ke Icon
        if (f.includes('wifi')) return <div key={f} className="flex items-center gap-1"><Wifi size={14} /> {facilityName}</div>;
        if (f.includes('ac') || f.includes('air')) return <div key={f} className="flex items-center gap-1"><Wind size={14} /> {facilityName}</div>;
        if (f.includes('break')) return <div key={f} className="flex items-center gap-1"><Coffee size={14} /> {facilityName}</div>;
        if (f.includes('tv')) return <div key={f} className="flex items-center gap-1"><Tv size={14} /> {facilityName}</div>;
        if (f.includes('netflix')) return <div key={f} className="flex items-center gap-1"><MonitorPlay size={14} /> {facilityName}</div>;
        if (f.includes('park')) return <div key={f} className="flex items-center gap-1"><Car size={14} /> {facilityName}</div>;
        if (f.includes('kitchen')) return <div key={f} className="flex items-center gap-1"><Utensils size={14} /> {facilityName}</div>;
        if (f.includes('hot') || f.includes('water')) return <div key={f} className="flex items-center gap-1"><Droplets size={14} /> {facilityName}</div>;

        // Default Icon kalau namanya aneh
        return <div key={f} className="flex items-center gap-1 text-gray-500">✓ {facilityName}</div>;
    };

    const formatRupiah = (price: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FEFBF3]"><Loader2 className="animate-spin text-keenan-gold" /></div>;
    if (!property) return <div>Not Found</div>;

    return (
        <div className="min-h-screen bg-[#FEFBF3] font-sans text-gray-800">

            {/* --- HEADER IMAGE (FULL WIDTH) --- */}
            <div className="relative h-[40vh] md:h-[50vh] w-full group">
                <img
                    src={property.image_url || "https://via.placeholder.com/1500"}
                    alt={property.name}
                    className="w-full h-full object-cover transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-black/30" />

                {/* Navbar Overlay */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center text-white z-20">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:text-keenan-gold transition-colors">
                        <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase tracking-widest">Back to Search</span>
                    </button>
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 text-white bg-gradient-to-t from-black/80 to-transparent">
                    <div className="container mx-auto">
                        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2">{property.name}</h1>
                        <p className="flex items-center text-sm md:text-lg opacity-90 font-light">
                            <MapPin size={18} className="mr-2 text-keenan-gold" /> {property.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- STICKY SEARCH BAR (MENGAMBANG) --- */}
            <div className="sticky top-0 z-40 bg-[#FEFBF3] shadow-sm border-b border-gray-200 py-4 px-4 transition-all">
                <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-end md:items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">

                    <div className="flex-1 w-full bg-white p-2 rounded border border-gray-200">
                        <label className="block mb-1 text-[10px]">Check In</label>
                        <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                            className="w-full text-sm font-bold text-gray-800 outline-none uppercase font-serif" />
                    </div>

                    <div className="flex-1 w-full bg-white p-2 rounded border border-gray-200">
                        <label className="block mb-1 text-[10px]">Check Out</label>
                        <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                            className="w-full text-sm font-bold text-gray-800 outline-none uppercase font-serif" />
                    </div>

                    <div className="w-full md:w-32 bg-white p-2 rounded border border-gray-200">
                        <label className="block mb-1 text-[10px]">Guests</label>
                        <select value={guests} onChange={e => setGuests(parseInt(e.target.value))}
                            className="w-full text-sm font-bold text-gray-800 outline-none">
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Person</option>)}
                        </select>
                    </div>

                    <button className="text-keenan-gold underline cursor-pointer hover:text-black transition-colors" onClick={() => window.location.reload()}>
                        Update Dates
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="container mx-auto px-4 py-12 max-w-6xl">

                {/* Description */}
                <div className="mb-12 max-w-3xl">
                    <h2 className="text-2xl font-serif font-bold text-keenan-dark mb-4 border-l-4 border-keenan-gold pl-4">About This Property</h2>
                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                        {property.description || "Rasakan kenyamanan menginap dengan fasilitas lengkap dan pelayanan terbaik. Cocok untuk liburan keluarga maupun perjalanan bisnis Anda."}
                    </p>
                </div>

                {/* --- ROOM LIST (LAYOUT BARU) --- */}
                <div className="space-y-12">
                    <h2 className="text-2xl font-serif font-bold text-keenan-dark mb-8 flex items-center gap-3">
                        <span className="w-8 h-[1px] bg-gray-400"></span> Available Rooms
                    </h2>

                    {(!property.room_types || property.room_types.length === 0) ? (
                        <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded">
                            <p className="text-gray-400 italic">Belum ada kamar yang tersedia saat ini.</p>
                        </div>
                    ) : (
                        property.room_types.map((room) => (
                            // CARD STYLE: Horizontal (Gambar Kiri, Info Kanan)
                            <div key={room.id} className="bg-white rounded-none border border-gray-200 flex flex-col md:flex-row overflow-hidden shadow-[0_2px_10px_-5px_rgba(0,0,0,0.1)] hover:shadow-lg transition-shadow">

                                {/* Image Section (40%) */}
                                <div className="md:w-5/12 h-64 md:h-auto relative overflow-hidden group">
                                    <img
                                        src={room.image_url || "https://via.placeholder.com/800"}
                                        alt={room.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded shadow-sm">
                                        Max {room.capacity}
                                    </div>
                                </div>

                                {/* Details Section (60%) */}
                                <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl md:text-3xl font-serif font-bold text-keenan-dark">{room.name}</h3>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-6 line-clamp-2">
                                            {room.description || "Kamar eksklusif dengan desain modern dan nyaman."}
                                        </p>

                                        {/* --- DYNAMIC FACILITIES RENDER --- */}
                                        <div className="mb-6">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Room Amenities</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                                                {room.facilities && room.facilities.length > 0 ? (
                                                    // LOOPING ARRAY DARI DATABASE
                                                    room.facilities.map(fac => renderFacilityIcon(fac))
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">No facilities listed</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between border-t border-gray-100 pt-6 mt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Start From</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-keenan-gold font-serif">{formatRupiah(room.base_price)}</span>
                                                <span className="text-xs text-gray-400">/ night</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => navigate('/booking', {
                                                state: {
                                                    room: room,
                                                    propertyName: property.name,
                                                    preSelectedCheckIn: checkIn,
                                                    preSelectedCheckOut: checkOut
                                                }
                                            })}
                                            className="bg-[#1A1A1A] text-white px-8 py-3 rounded-sm font-bold uppercase text-xs tracking-[0.2em] hover:bg-keenan-gold transition-colors"
                                        >
                                            Select Room
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyDetails;