import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MapPin, Users, Wifi, Wind, Coffee, ArrowLeft } from 'lucide-react';

// Tipe Data
interface RoomType {
    id: string;
    name: string;
    description: string;
    base_price: number;
    capacity: number;
    image_url: string;
    facilities: string[];
}

interface Property {
    id: string;
    name: string;
    address: string;
    description: string;
    image_url: string;
    room_types: RoomType[]; // Relasi nested
}

const PropertyDetails = () => {
    const { id } = useParams(); // Ambil ID dari URL
    const [searchParams] = useSearchParams(); // Ambil tanggal dari URL (?checkIn=...)
    const navigate = useNavigate();

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    // Ambil data check-in/out dari URL (atau default besok)
    const checkIn = searchParams.get('checkIn') || new Date().toISOString().split('T')[0];
    const checkOut = searchParams.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    useEffect(() => {
        const fetchPropertyDetails = async () => {
            if (!id) return;

            // Query Supabase: Ambil Property BESERTA Room Types-nya (Join)
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          room_types (*)
        `)
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error:", error);
            } else {
                setProperty(data);
            }
            setLoading(false);
        };

        fetchPropertyDetails();
    }, [id]);

    // Format Rupiah
    const formatRupiah = (price: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    };

    if (loading) return <div className="p-10 text-center text-keenan-gold animate-pulse">Loading property details...</div>;
    if (!property) return <div className="p-10 text-center">Property not found.</div>;

    return (
        <div className="min-h-screen bg-keenan-cream text-keenan-dark pb-20">

            {/* --- HEADER IMAGE --- */}
            <div className="relative h-[50vh]">
                <img
                    src={property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"}
                    alt={property.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-0 left-0 p-8 text-white container mx-auto">
                    <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm hover:text-keenan-gold transition-colors">
                        <ArrowLeft size={16} /> Back to Search
                    </button>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">{property.name}</h1>
                    <p className="flex items-center text-lg opacity-90">
                        <MapPin size={18} className="mr-2 text-keenan-gold" /> {property.address}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 relative z-10">

                {/* --- INFO BAR --- */}
                <div className="bg-white p-6 rounded shadow-lg border-t-4 border-keenan-gold flex flex-wrap gap-6 items-center justify-between mb-10">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Check In</p>
                        <p className="font-bold text-lg">{new Date(checkIn).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Check Out</p>
                        <p className="font-bold text-lg">{new Date(checkOut).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                    </div>
                    <div>
                        <button className="text-keenan-gold text-sm font-bold underline" onClick={() => navigate('/')}>
                            Change Dates
                        </button>
                    </div>
                </div>

                {/* --- ROOM LIST --- */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-serif border-l-4 border-keenan-gold pl-4">Available Rooms</h2>

                    {property.room_types.length === 0 ? (
                        <p className="text-gray-500 italic">Belum ada tipe kamar yang diinput untuk properti ini.</p>
                    ) : (
                        property.room_types.map((room) => (
                            <div key={room.id} className="bg-white rounded-lg overflow-hidden shadow-md flex flex-col md:flex-row hover:shadow-xl transition-shadow border border-gray-100">
                                {/* Room Image */}
                                <div className="md:w-1/3 h-64 md:h-auto relative">
                                    <img
                                        src={room.image_url || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"}
                                        alt={room.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Room Details */}
                                <div className="p-6 md:w-2/3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-bold font-serif">{room.name}</h3>
                                            <div className="flex items-center gap-1 text-sm bg-keenan-gray px-2 py-1 rounded">
                                                <Users size={14} /> Max {room.capacity}
                                            </div>
                                        </div>
                                        <p className="text-gray-500 mb-4 text-sm line-clamp-2">{room.description || "Kamar nyaman dengan fasilitas lengkap standar bintang lima."}</p>

                                        {/* Facilities Icons (Hardcoded dummy logic for visual) */}
                                        <div className="flex gap-4 text-gray-400 mb-6">
                                            <div className="flex items-center gap-1 text-xs"><Wifi size={14} /> Free Wifi</div>
                                            <div className="flex items-center gap-1 text-xs"><Wind size={14} /> AC</div>
                                            <div className="flex items-center gap-1 text-xs"><Coffee size={14} /> Breakfast</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase">Start From</p>
                                            <p className="text-2xl font-bold text-keenan-gold">{formatRupiah(room.base_price)} <span className="text-sm text-gray-400 font-normal">/ night</span></p>
                                        </div>
                                        <button
                                            className="bg-keenan-dark text-white px-8 py-3 rounded font-bold uppercase tracking-wider hover:bg-keenan-gold transition-colors"
                                            onClick={() => alert("Fitur Booking Form akan kita buat di Step selanjutnya!")}
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