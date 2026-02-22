import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
    MapPin, ArrowRight,
    Wifi, Wind, Coffee, Tv, Car, Utensils, ShieldCheck, Loader2
} from 'lucide-react';

export default function BookingSearch() {
    const navigate = useNavigate();
    const [properties, setProperties] = useState<any[]>([]);
    
    // State untuk Background Hero dan Loading
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Search State
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests] = useState(1);
    const [selectedPropId, setSelectedPropId] = useState('');

    useEffect(() => {
        fetchProperties();
    }, []);

    // Effect untuk Autoplay Slide Gambar Hero
    useEffect(() => {
        if (properties.length > 0) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prevIndex) => 
                    prevIndex === properties.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [properties]);

    const fetchProperties = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/properties');
            setProperties(response.data || []);
        } catch (error) {
            console.error("Gagal mengambil data properti:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        if (!selectedPropId) return alert("Pilih lokasi properti dulu!");
        navigate(`/property/${selectedPropId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
    };

    const getFacilityIcon = (fac: string) => {
        const f = fac.toLowerCase();
        const style = "flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500";

        if (f.includes('wifi') || f.includes('internet')) return <div className={style}><Wifi size={14} className="text-keenan-gold" /> Wifi</div>;
        if (f.includes('ac') || f.includes('air')) return <div className={style}><Wind size={14} className="text-keenan-gold" /> AC</div>;
        if (f.includes('break') || f.includes('kitchen') || f.includes('pantry')) return <div className={style}><Utensils size={14} className="text-keenan-gold" /> Kitchen</div>;
        if (f.includes('tv') || f.includes('netflix')) return <div className={style}><Tv size={14} className="text-keenan-gold" /> TV/Netflix</div>;
        if (f.includes('park')) return <div className={style}><Car size={14} className="text-keenan-gold" /> Parking</div>;
        if (f.includes('coffee')) return <div className={style}><Coffee size={14} className="text-keenan-gold" /> Coffee</div>;

        return <div className={style}><ShieldCheck size={14} className="text-keenan-gold" /> {fac}</div>;
    }

    return (
        <div className="font-sans text-gray-800 bg-white">

            {/* --- NAVBAR --- */}
            <nav className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold font-serif tracking-widest">KEENAN <span className="font-light">Living</span></div>
                </div>
                <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest">
                    <a href="#" className="hover:text-keenan-gold transition-colors">About Us</a>
                    <a href="#properties" className="hover:text-keenan-gold transition-colors">Properties</a>
                    <a href="#facilities" className="hover:text-keenan-gold transition-colors">Facilities</a>
                    <a href="#contact" className="hover:text-keenan-gold transition-colors">Contact</a>
                </div>
                <button onClick={() => navigate('/admin/login')} className="bg-keenan-gold text-white px-6 py-2 rounded font-bold text-xs hover:bg-white hover:text-keenan-gold transition-all">
                    LOGIN
                </button>
            </nav>

            {/* --- HERO SECTION --- */}
            <div className="relative h-[70vh] md:h-[85vh] w-full bg-gray-900 overflow-visible flex items-center justify-center">
                
                {isLoading ? (
                    <div className="absolute inset-0 bg-gray-900 animate-pulse"></div>
                ) : properties.length > 0 ? (
                    properties.map((prop, index) => (
                        <img
                            key={prop.id}
                            src={prop.image_url}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                                index === currentImageIndex ? 'opacity-50' : 'opacity-0'
                            }`}
                            alt={prop.name}
                        />
                    ))
                ) : (
                    <div className="absolute inset-0 bg-gray-900 opacity-60"></div>
                )}
                
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-4 pb-20 z-10">
                    <p className="text-sm md:text-base uppercase tracking-[0.3em] mb-4 opacity-90 animate-in slide-in-from-bottom-4">Welcome to Keenan Living</p>
                    <h1 className="text-4xl md:text-7xl font-serif font-bold mb-6 max-w-4xl leading-tight animate-in slide-in-from-bottom-8 duration-700">
                        Discover the Ideal Getaway <br /> You've Always Imagined
                    </h1>
                    <button onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })} className="mt-8 bg-transparent border-2 border-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                        View All Properties
                    </button>
                </div>

                {/* --- SEARCH BAR (FIXED LAYOUT) --- */}
                <div id="search-bar" className="absolute bottom-0 left-0 right-0 px-4 translate-y-1/2 z-[60]">
                    {/* Mengubah layout md ke lg agar lebih lega, dan memisahkan button dari guest */}
                    <div className="bg-white p-5 lg:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-end justify-between max-w-6xl mx-auto rounded-lg border-t-4 border-keenan-gold">

                        {/* Property */}
                        <div className="w-full lg:flex-[1.5]">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Property</label>
                            <select
                                className="w-full p-3 bg-gray-50 border-b border-gray-200 focus:border-keenan-gold outline-none font-serif text-base disabled:opacity-50"
                                value={selectedPropId}
                                onChange={e => setSelectedPropId(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="">{isLoading ? "Loading..." : "Select Destination"}</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {/* Dates */}
                        <div className="w-full lg:flex-[2] grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Check-In</label>
                                <input type="date" className="w-full p-3 bg-gray-50 border-b border-gray-200 outline-none font-serif text-sm lg:text-base"
                                    onChange={e => setCheckIn(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Check-Out</label>
                                <input type="date" className="w-full p-3 bg-gray-50 border-b border-gray-200 outline-none font-serif text-sm lg:text-base"
                                    onChange={e => setCheckOut(e.target.value)} />
                            </div>
                        </div>

                        {/* Guests (Diberi Fixed Minimum Width) */}
                        <div className="w-full lg:w-32 flex-shrink-0">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Guests</label>
                            <select className="w-full p-3 bg-gray-50 border-b border-gray-200 outline-none font-serif text-base" onChange={e => setGuests(parseInt(e.target.value))}>
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Person</option>)}
                            </select>
                        </div>

                        {/* Button (Diberi Flex Shrink 0 agar ukurannya tidak mengecil) */}
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="w-full lg:w-auto bg-keenan-gold text-white px-8 py-3.5 font-bold uppercase tracking-widest hover:bg-black transition-all whitespace-nowrap rounded shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                        >
                            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Memuat</> : "Find Rooms"}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- PROPERTIES GRID --- */}
            <div id="properties" className="pt-32 md:pt-48 pb-20 bg-[#FAFAFA]">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16">
                        <p className="text-keenan-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">Our Properties</p>
                        <h2 className="text-2xl md:text-4xl font-serif font-bold text-keenan-dark">Your Top Destination Vacation Home</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
                                    <div className="h-64 bg-gray-200"></div>
                                    <div className="p-6">
                                        <div className="h-3 bg-gray-200 w-1/3 mb-4 rounded"></div>
                                        <div className="h-6 bg-gray-200 w-3/4 mb-6 rounded"></div>
                                        <div className="h-10 bg-gray-100 rounded mt-auto"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            properties.map((prop) => (
                                <div key={prop.id} className="group cursor-pointer bg-white flex flex-col shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden" onClick={() => navigate(`/property/${prop.id}`)}>
                                    <div className="h-64 overflow-hidden relative bg-gray-100">
                                        <img
                                            src={prop.image_url}
                                            alt={prop.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        <button className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-lg">
                                            <ArrowRight size={20} />
                                        </button>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">{prop.address?.split(',')[0]}</p>
                                        <h3 className="text-lg font-serif font-bold text-keenan-dark mb-4 group-hover:text-keenan-gold transition-colors">{prop.name}</h3>

                                        <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-2 gap-y-2">
                                            {prop.room_types && prop.room_types.length > 0 && prop.room_types[0].facilities ? (
                                                prop.room_types[0].facilities.slice(0, 4).map((fac: string, idx: number) => (
                                                    <div key={idx}>
                                                        {getFacilityIcon(fac)}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400 italic col-span-2">Standard Facilities</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* --- FACILITIES SECTION --- */}
            <div id="facilities" className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-5xl text-center">
                    <p className="text-keenan-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">Our Facilities</p>
                    <h2 className="text-4xl font-serif font-bold text-keenan-dark mb-16">Where Comfort Meets Convenience</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                        <div className="flex gap-6">
                            <div className="text-4xl font-thin text-gray-300">01</div>
                            <div>
                                <h3 className="font-serif font-bold text-xl mb-3">Cozy Bedroom</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">Designed to provide maximum comfort, featuring plush Queen-sized beds and soft linens.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-4xl font-thin text-gray-300">02</div>
                            <div>
                                <h3 className="font-serif font-bold text-xl mb-3">Modern Kitchen</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">Equipped with the latest appliances for your cooking convenience.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-4xl font-thin text-gray-300">03</div>
                            <div>
                                <h3 className="font-serif font-bold text-xl mb-3">TV & Netflix</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">Extensive selection of entertainment channels to enhance your relaxation.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-4xl font-thin text-gray-300">04</div>
                            <div>
                                <h3 className="font-serif font-bold text-xl mb-3">Spacious Parking</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">Secure environment ensuring your vehicle is well-protected.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer id="contact" className="bg-black text-white py-20 border-t border-gray-900">
                <div className="container mx-auto px-4 max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="text-3xl font-bold font-serif tracking-widest mb-6">KEENAN <span className="font-light">Living</span></div>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-6">
                            Jl. Seturan Raya, Gg. Asrama UKDW, Ngropoh, Condongcatur, Kec. Depok, Kabupaten Sleman, DIY 55281
                        </p>
                        <p className="text-keenan-gold font-bold flex items-center gap-2 cursor-pointer hover:underline"><MapPin size={16} /> View on Google Maps</p>
                    </div>

                    <div>
                        <h4 className="font-bold uppercase tracking-widest mb-6 text-sm">Quick Links</h4>
                        <ul className="space-y-4 text-gray-400 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="#properties" className="hover:text-white transition-colors">Properties</a></li>
                            <li><a href="#facilities" className="hover:text-white transition-colors">Facilities</a></li>
                            <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold uppercase tracking-widest mb-6 text-sm">Follow Us</h4>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer">IG</div>
                            <div className="w-10 h-10 border border-gray-700 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer">TK</div>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-20 pt-8 border-t border-gray-900 text-center text-xs text-gray-600">
                    &copy; 2026 Keenan Living Group. All rights reserved.
                </div>
            </footer>

        </div >
    );
}