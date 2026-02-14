import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Users, MapPin, Search } from 'lucide-react';

interface Property {
    id: string;
    name: string;
    address: string;
    image_url: string;
    description: string;
}

const BookingSearch = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // State Form Pencarian
    const [searchParams, setSearchParams] = useState({
        checkIn: '',
        checkOut: '',
        guests: 1
    });

    // Fetch Data Property dari Supabase
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const { data, error } = await supabase
                    .from('properties')
                    .select('*');

                if (error) throw error;
                setProperties(data || []);
            } catch (err) {
                console.error("Gagal ambil data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, []);

    return (
        <div className="min-h-screen bg-keenan-cream font-sans text-keenan-dark">
            {/* --- HERO SECTION --- */}
            <div className="relative h-[60vh] bg-keenan-dark flex items-center justify-center">
                {/* Background Image Overlay */}
                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070')] bg-cover bg-center" />

                <div className="relative z-10 text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-serif text-keenan-white mb-4 tracking-wider">
                        KEENAN LIVING
                    </h1>
                    <p className="text-keenan-gray text-lg md:text-xl font-light tracking-widest uppercase">
                        Experience Comfort & Luxury
                    </p>
                </div>
            </div>

            {/* --- SEARCH WIDGET (Floating) --- */}
            <div className="relative -mt-16 z-20 container mx-auto px-4">
                <div className="bg-white p-6 md:p-8 rounded shadow-xl border-t-4 border-keenan-gold grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                    {/* Check In */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Check In</label>
                        <div className="flex items-center border border-gray-200 p-3 rounded bg-gray-50">
                            <Calendar size={18} className="text-keenan-gold mr-2" />
                            <input
                                type="date"
                                className="bg-transparent outline-none w-full text-sm"
                                onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Check Out */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Check Out</label>
                        <div className="flex items-center border border-gray-200 p-3 rounded bg-gray-50">
                            <Calendar size={18} className="text-keenan-gold mr-2" />
                            <input
                                type="date"
                                className="bg-transparent outline-none w-full text-sm"
                                onChange={(e) => setSearchParams({ ...searchParams, checkOut: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Guests */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Guests</label>
                        <div className="flex items-center border border-gray-200 p-3 rounded bg-gray-50">
                            <Users size={18} className="text-keenan-gold mr-2" />
                            <select
                                className="bg-transparent outline-none w-full text-sm"
                                onChange={(e) => setSearchParams({ ...searchParams, guests: parseInt(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num}>{num} Guest(s)</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Button */}
                    <button className="bg-keenan-gold hover:bg-[#b08d55] text-white p-3 rounded font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 h-[46px]">
                        <Search size={18} /> Check Availability
                    </button>
                </div>
            </div>

            {/* --- PROPERTY LIST --- */}
            <div className="container mx-auto px-4 py-16">
                <h2 className="text-2xl font-serif text-center mb-10">Our Properties</h2>

                {loading ? (
                    <p className="text-center text-gray-500">Loading properties...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {properties.map((prop) => (
                            <div key={prop.id} className="bg-white rounded overflow-hidden shadow-md hover:shadow-xl transition-shadow group">
                                <div className="h-64 overflow-hidden relative">
                                    {/* Fallback Image kalau null */}
                                    <img
                                        src={prop.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"}
                                        alt={prop.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute bottom-0 left-0 bg-black/50 text-white px-4 py-2 flex items-center text-xs">
                                        <MapPin size={14} className="mr-1 text-keenan-gold" /> {prop.address}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-2">{prop.name}</h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{prop.description || "Nikmati kenyamanan menginap terbaik bersama Keenan Living."}</p>

                                    <button
                                        onClick={() => navigate(`/property/${prop.id}?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&guests=${searchParams.guests}`)}
                                        className="w-full border border-keenan-dark text-keenan-dark hover:bg-keenan-dark hover:text-white py-3 px-4 rounded transition-all text-sm uppercase font-bold tracking-widest"
                                    >
                                        View Rooms
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State kalau database masih kosong */}
                {!loading && properties.length === 0 && (
                    <div className="text-center p-10 bg-white rounded border border-dashed border-gray-300">
                        <p className="text-gray-400">Belum ada properti yang diinput di Database.</p>
                        <p className="text-xs text-keenan-gold mt-2">Silakan insert data dummy di SQL Editor Supabase.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingSearch;