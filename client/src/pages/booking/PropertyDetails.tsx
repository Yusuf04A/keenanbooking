import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import {
    MapPin, Users, Wifi, Wind, Coffee, ArrowLeft, Loader2,
    Tv, Car, Utensils, Droplets, MonitorPlay, AlertCircle,
    ChevronDown, ChevronUp, Camera, CheckCircle, ExternalLink, X, ChevronLeft, ChevronRight
} from 'lucide-react';

// --- STANDALONE INTERACTIVE MAP COMPONENT ---
const InteractiveMap = ({ address, propertyName }: { address: string; propertyName: string }) => {
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    return (
        <div className="h-72 rounded-2xl border border-gray-200 overflow-hidden relative group">
            <iframe
                src={src}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={propertyName}
            />
            <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank" rel="noopener noreferrer"
                className="absolute bottom-3 right-3 z-10 bg-white text-gray-700 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-gray-50 border border-gray-100 opacity-90 hover:opacity-100 transition-opacity"
            >
                <ExternalLink size={12} /> Open in Google Maps
            </a>
        </div>
    );
};

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAllPropertyFacilities, setShowAllPropertyFacilities] = useState(false);

    // Per-room facilities toggle: record of room.id -> boolean
    const [expandedFacilities, setExpandedFacilities] = useState<Record<string, boolean>>({});

    // --- LIGHTBOX STATE ---
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // --- REAL-TIME STOCK STATE ---
    const [realTimeStock, setRealTimeStock] = useState<Record<string, number>>({});
    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // --- DATE LOGIC ---
    const searchParams = new URLSearchParams(location.search);
    const urlCheckIn = searchParams.get('checkIn');
    const urlCheckOut = searchParams.get('checkOut');

    const today = new Date().toISOString().split('T')[0];

    const getNextDay = (dateStr: string) => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const addMonths = (dateStr: string, months: number) => {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    };

    const defaultCheckOut = getNextDay(today);

    const [checkIn, setCheckIn] = useState(location.state?.checkIn || urlCheckIn || today);
    const [checkOut, setCheckOut] = useState(location.state?.checkOut || urlCheckOut || defaultCheckOut);

    const calculateNights = () => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    };
    const totalNights = calculateNights();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/properties/${id}`);
                setProperty(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const checkAllRoomsAvailability = async () => {
        if (!property?.room_types) return;
        setIsCheckingStock(true);
        const newStocks: Record<string, number> = {};
        await Promise.all(property.room_types.map(async (r: any) => {
            try {
                const checkOutDateForAvailability = r.rental_category === 'bulanan'
                    ? addMonths(checkIn, Math.max(1, Math.ceil(totalNights / 30)))
                    : checkOut;
                const res = await api.get('/availability/check', {
                    params: { room_type_id: r.id, check_in: checkIn, check_out: checkOutDateForAvailability }
                });
                newStocks[r.id] = res.data.available;
            } catch (err) {
                newStocks[r.id] = 0;
            }
        }));
        setRealTimeStock(newStocks);
        setIsCheckingStock(false);
    };

    useEffect(() => {
        if (property && property.room_types && property.room_types.length > 0) {
            checkAllRoomsAvailability();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkIn, checkOut, property]);

    const formatRupiah = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const handleBooking = (selectedRoom: any, finalPrice: number, calculatedDuration: number, durationType: string, exactCheckOut: string) => {
        navigate('/booking', {
            state: {
                room: selectedRoom,
                propertyName: property.name,
                preSelectedCheckIn: checkIn,
                preSelectedCheckOut: exactCheckOut,
                totalPriceOverride: finalPrice,
                bookingDurationType: durationType,
                calculatedDuration: calculatedDuration
            },
        });
    };

    const getFacilityIcon = (facilityName: string) => {
        const f = facilityName.toLowerCase();
        if (f.includes('wifi') || f.includes('internet')) return <Wifi size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('ac') || f.includes('air')) return <Wind size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('break') || f.includes('makan')) return <Coffee size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('tv')) return <Tv size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('netflix')) return <MonitorPlay size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('park')) return <Car size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('kitchen') || f.includes('pantry') || f.includes('dapur')) return <Utensils size={15} className="text-gray-400 shrink-0" />;
        if (f.includes('hot') || f.includes('water') || f.includes('shower')) return <Droplets size={15} className="text-gray-400 shrink-0" />;
        return <CheckCircle size={15} className="text-gray-300 shrink-0" />;
    };

    const getAllImages = () => {
        const imgs: string[] = [];
        if (property?.image_url) imgs.push(property.image_url);
        let gallery: string[] = [];
        try {
            if (Array.isArray(property?.gallery_images)) gallery = property.gallery_images;
            else if (typeof property?.gallery_images === 'string') gallery = JSON.parse(property.gallery_images);
        } catch (e) {}
        if (Array.isArray(gallery)) imgs.push(...gallery);
        return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070'];
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FEFBF3]"><Loader2 className="animate-spin text-keenan-gold" size={40} /></div>;

    if (!property) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#FEFBF3] text-center p-4">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Data tidak lengkap</h1>
            <p className="text-gray-500 mb-6">Properti tidak ditemukan.</p>
            <button onClick={() => navigate('/')} className="bg-keenan-dark text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-black transition-all">Back to Home</button>
        </div>
    );

    const allPropertyFacilities = [...new Set((property.room_types || []).flatMap((r: any) => {
        let fac: any[] = [];
        try {
            if (Array.isArray(r.facilities)) fac = r.facilities;
            else if (typeof r.facilities === 'string') {
                const parsed = JSON.parse(r.facilities);
                fac = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            }
        } catch (e) {}
        return Array.isArray(fac) ? fac : [];
    }))] as string[];

    const visiblePropertyFacilities = showAllPropertyFacilities ? allPropertyFacilities : allPropertyFacilities.slice(0, 9);

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-800">

            {/* --- TOP NAV --- */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="container mx-auto max-w-7xl">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-keenan-dark transition-colors text-sm font-medium">
                        <ArrowLeft size={16} /><span>Back to Properties</span>
                    </button>
                </div>
            </div>

            {/* --- PHOTO GRID --- */}
            <div className="container mx-auto max-w-7xl px-4 md:px-6 py-6">
                {(() => {
                    let galleryImages: string[] = [];
                    try {
                        if (Array.isArray(property.gallery_images)) galleryImages = property.gallery_images;
                        else if (typeof property.gallery_images === 'string') galleryImages = JSON.parse(property.gallery_images);
                    } catch (e) {}

                    const placeholderImages = [
                        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070",
                        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070",
                        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
                        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070",
                    ];

                    const gridSmall: string[] = [];
                    for (let i = 0; i < 4; i++) gridSmall.push(galleryImages[i] || placeholderImages[i]);

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-auto md:h-[420px] rounded-2xl overflow-hidden">
                            <div className="md:col-span-2 md:row-span-2 overflow-hidden h-64 md:h-full">
                                <img src={property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"} alt={property.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                            <div className="hidden md:contents">
                                {gridSmall.map((img, idx) => (
                                    <div key={idx} className="relative overflow-hidden group">
                                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {idx === 3 && (
                                            <button onClick={() => { setLightboxIndex(0); setShowLightbox(true); }} className="absolute bottom-3 right-3 bg-black/80 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-black transition-colors">
                                                <Camera size={14} /> Show all photos
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => { setLightboxIndex(0); setShowLightbox(true); }} className="md:hidden mt-2 w-full bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                                <Camera size={16} /> Show all photos
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* --- PROPERTY TITLE --- */}
            <div className="container mx-auto max-w-7xl px-4 md:px-6 pb-6 pt-4">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-2">{property.name}</h1>
                <p className="text-gray-500 text-sm md:text-base flex items-center gap-1.5">
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    {property.address}
                </p>
            </div>

            {/* --- SEARCH BAR --- */}
            <div className="bg-[#F5E6C8] py-8 md:py-10">
                <div className="container mx-auto max-w-7xl px-4 md:px-6 flex justify-center">
                    <div className="bg-white flex flex-col md:flex-row overflow-hidden w-full max-w-4xl shadow-lg rounded-2xl border-b-4 border-keenan-gold">
                        <div className="flex-1 px-6 py-5 border-b md:border-b-0 md:border-r border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Check-In</p>
                            <input
                                type="date"
                                value={checkIn}
                                min={today}
                                onChange={(e) => {
                                    setCheckIn(e.target.value);
                                    if (e.target.value >= checkOut) {
                                        setCheckOut(getNextDay(e.target.value));
                                    }
                                }}
                                className="text-lg font-serif text-gray-900 outline-none bg-transparent w-full cursor-pointer"
                            />
                        </div>
                        <div className="flex-1 px-6 py-5 border-b md:border-b-0 md:border-r border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Check-Out</p>
                            <input
                                type="date"
                                value={checkOut}
                                min={getNextDay(checkIn)}
                                onChange={e => setCheckOut(e.target.value)}
                                className="text-lg font-serif text-gray-900 outline-none bg-transparent w-full cursor-pointer"
                            />
                        </div>
                        <div className="md:w-48 px-6 py-5 bg-gray-50/50 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Durasi Inap</p>
                            <p className="text-2xl font-bold text-keenan-dark">{totalNights} <span className="text-sm font-medium text-gray-500">Malam</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ROOM & RATES --- */}
            <div className="bg-white py-12 border-t border-gray-100">
                <div className="container mx-auto max-w-7xl px-4 md:px-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-1">Room & Rates</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        {isCheckingStock ? "Sedang mengecek ketersediaan..." : "Pilih tipe kamar yang sesuai dengan kebutuhan Anda"}
                    </p>

                    <div className="space-y-4">
                        {property.room_types.map((room: any) => {
                            const currentStock = isCheckingStock ? 0 : (realTimeStock[room.id] ?? room.total_stock);
                            const isSoldOut = !isCheckingStock && currentStock === 0;
                            const isMonthly = room.rental_category === 'bulanan';

                            const calculatedMonths = Math.max(1, Math.ceil(totalNights / 30));
                            const calculatedPrice = isMonthly
                                ? (Number(room.price_monthly) || 0) * calculatedMonths
                                : (Number(room.price_daily) || Number(room.base_price) || 0) * totalNights;

                            const exactCheckOutDate = isMonthly
                                ? addMonths(checkIn, calculatedMonths)
                                : checkOut;

                            let safeFacilities: string[] = [];
                            try {
                                if (Array.isArray(room.facilities)) safeFacilities = room.facilities;
                                else if (typeof room.facilities === 'string') {
                                    const parsed = JSON.parse(room.facilities);
                                    safeFacilities = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
                                }
                            } catch (e) { safeFacilities = []; }
                            if (!Array.isArray(safeFacilities)) safeFacilities = [];

                            // Per-room expand state
                            const isExpanded = expandedFacilities[room.id] || false;
                            const visibleFacilities = isExpanded ? safeFacilities : safeFacilities.slice(0, 5);

                            // Unified badge style: same as category label
                            const stockBadgeClass = isSoldOut
                                ? 'border border-gray-200 text-gray-400 bg-white'
                                : currentStock <= 3
                                    ? 'border border-keenan-gold/50 text-keenan-gold bg-keenan-gold/5'
                                    : 'border border-keenan-gold/50 text-keenan-gold bg-keenan-gold/5';

                            return (
                                <div
                                    key={room.id}
                                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-all duration-300 relative group"
                                >
                                    {isCheckingStock && (
                                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                            <Loader2 className="animate-spin text-keenan-gold" />
                                        </div>
                                    )}

                                    {/* Room Image — compact fixed width */}
                                    <div className="w-full md:w-52 h-48 md:h-auto shrink-0 overflow-hidden relative">
                                        <img
                                            src={room.image_url || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"}
                                            alt={room.name}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isSoldOut ? 'grayscale opacity-70' : 'group-hover:scale-105'}`}
                                        />
                                    </div>

                                    {/* Middle: Room Info */}
                                    <div className="flex-1 px-5 py-5 flex flex-col justify-between min-w-0">
                                        <div>
                                            {/* Name row */}
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-lg font-serif font-bold text-gray-900 leading-tight">{room.name}</h3>
                                                {/* Category badge */}
                                                <span className="border border-keenan-gold/50 text-keenan-gold text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest bg-keenan-gold/5 whitespace-nowrap">
                                                    {isMonthly ? 'Bulanan' : 'Harian'}
                                                </span>
                                                {/* Stock badge — same style */}
                                                {!isCheckingStock && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest whitespace-nowrap ${stockBadgeClass}`}>
                                                        {isSoldOut
                                                            ? 'Sold Out'
                                                            : currentStock <= 3
                                                                ? `Sisa ${currentStock} Unit`
                                                                : `${currentStock} Unit Tersedia`
                                                        }
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-gray-400 text-xs mb-4 flex items-center gap-1.5">
                                                <Users size={12} className="text-gray-300" /> Maks. {room.capacity} Tamu
                                            </p>

                                            {/* Facilities */}
                                            {safeFacilities.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-2">Fasilitas</p>
                                                    <div className="flex flex-wrap gap-x-5 gap-y-2 mb-1">
                                                        {visibleFacilities.map((fac: string, i: number) => (
                                                            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                {getFacilityIcon(fac)}
                                                                <span>{fac}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {safeFacilities.length > 5 && (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedFacilities(prev => ({
                                                                    ...prev,
                                                                    [room.id]: !prev[room.id]
                                                                }))
                                                            }
                                                            className="text-[10px] text-keenan-gold font-bold flex items-center gap-1 mt-2 hover:text-keenan-dark transition-colors"
                                                        >
                                                            {isExpanded
                                                                ? <><ChevronUp size={12} /> Sembunyikan</>
                                                                : <><ChevronDown size={12} /> Fasilitas lainnya</>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Price + CTA — compact */}
                                    <div className="shrink-0 px-5 py-5 flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-gray-100 w-full md:w-52 bg-gray-50/40 group-hover:bg-keenan-gold/5 transition-colors">
                                        <div className="text-right w-full mb-4">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">
                                                Total {isMonthly ? `${calculatedMonths} Bulan` : `${totalNights} Malam`}
                                            </p>
                                            <p className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                                                {formatRupiah(calculatedPrice)}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {isMonthly
                                                    ? `${formatRupiah(room.price_monthly || 0)} / bulan`
                                                    : `${formatRupiah(room.price_daily || room.base_price)} / malam`
                                                }
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleBooking(room, calculatedPrice, isMonthly ? calculatedMonths : totalNights, isMonthly ? 'monthly' : 'daily', exactCheckOutDate)}
                                            disabled={isSoldOut || isCheckingStock}
                                            className={`w-full py-2.5 font-bold uppercase text-[10px] tracking-widest transition-all rounded-xl
                                                ${isSoldOut || isCheckingStock
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-keenan-dark hover:bg-black text-white hover:shadow-md'
                                                }`}
                                        >
                                            {isCheckingStock ? 'Checking...' : (isSoldOut ? 'Full Booked' : 'Book Now')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- ABOUT SECTION --- */}
            <div className="bg-[#FEFBF3] py-16">
                <div className="container mx-auto max-w-7xl px-4 md:px-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-6">About {property.name}</h2>
                    <div className="max-w-4xl text-gray-600 leading-relaxed text-sm md:text-base text-justify whitespace-pre-line">
                        {property.description || "Rasakan kenyamanan menginap dengan fasilitas lengkap dan pelayanan terbaik di Keenan Living. Nikmati kemudahan akses dan suasana yang seperti rumah sendiri."}
                    </div>
                </div>
            </div>

            {/* --- FACILITIES SECTION --- */}
            {allPropertyFacilities.length > 0 && (
                <div className="bg-white py-16 border-t border-gray-100">
                    <div className="container mx-auto max-w-7xl px-4 md:px-6">
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-10">Property Facilities</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-8">
                            {visiblePropertyFacilities.map((fac, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm md:text-base text-gray-700 font-medium">
                                    <div className="w-8 h-8 rounded-full bg-keenan-gold/10 flex items-center justify-center text-keenan-gold">
                                        {getFacilityIcon(fac)}
                                    </div>
                                    <span>{fac}</span>
                                </div>
                            ))}
                        </div>
                        {allPropertyFacilities.length > 9 && (
                            <button onClick={() => setShowAllPropertyFacilities(!showAllPropertyFacilities)} className="mt-10 px-6 py-2.5 rounded-full border border-keenan-gold text-sm text-keenan-gold font-bold hover:bg-keenan-gold hover:text-white transition-all flex items-center gap-2">
                                {showAllPropertyFacilities ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> Show All Facilities</>}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- LOCATION --- */}
            <div className="bg-[#FAFAFA] py-16 border-t border-gray-100">
                <div className="container mx-auto max-w-7xl px-4 md:px-6">
                    <div className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-3">Location</h2>
                        <p className="text-gray-600 flex items-start md:items-center gap-2">
                            <MapPin size={18} className="text-red-500 shrink-0 mt-0.5 md:mt-0" />
                            {property.address}
                        </p>
                    </div>
                    <InteractiveMap address={property.address} propertyName={property.name} />
                </div>
            </div>

            {/* --- GALLERY LIGHTBOX --- */}
            {showLightbox && (() => {
                const allImgs = getAllImages();
                return (
                    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
                        <div className="flex justify-between items-center p-4 md:p-6 shrink-0">
                            <p className="text-white font-medium text-sm md:text-base">
                                {property.name} <span className="text-gray-500 mx-2">|</span>
                                <span className="text-keenan-gold">{lightboxIndex + 1} / {allImgs.length}</span>
                            </p>
                            <button onClick={() => setShowLightbox(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        <div className="flex-1 flex items-center justify-center relative px-4">
                            <button onClick={() => setLightboxIndex(i => (i - 1 + allImgs.length) % allImgs.length)} className="absolute left-2 md:left-8 z-10 p-3 bg-black/50 hover:bg-black text-white rounded-full transition-colors backdrop-blur-md border border-white/10">
                                <ChevronLeft size={32} />
                            </button>
                            <img src={allImgs[lightboxIndex]} alt={`Photo ${lightboxIndex + 1}`} className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl" />
                            <button onClick={() => setLightboxIndex(i => (i + 1) % allImgs.length)} className="absolute right-2 md:right-8 z-10 p-3 bg-black/50 hover:bg-black text-white rounded-full transition-colors backdrop-blur-md border border-white/10">
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default PropertyDetails;