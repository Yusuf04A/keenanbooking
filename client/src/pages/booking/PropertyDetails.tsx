import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import {
    MapPin, Users, Wifi, Wind, Coffee, ArrowLeft, Loader2,
    Tv, Car, Utensils, Droplets, MonitorPlay, AlertCircle,
    ChevronDown, ChevronUp, Camera, CheckCircle, X, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';

// --- STANDALONE INTERACTIVE MAP COMPONENT (Google Maps Embed, no API key) ---
const InteractiveMap = ({ address, propertyName }: { address: string; propertyName: string }) => {
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=16`;
    return (
        <div className="h-72 rounded-2xl border border-gray-200 overflow-hidden relative">
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
                href={`https://maps.google.com/maps?q=${encodeURIComponent(address)}`}
                target="_blank" rel="noopener noreferrer"
                className="absolute bottom-3 right-3 z-10 bg-white text-gray-700 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-gray-50 border border-gray-100"
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
    const [showAllFacilities, setShowAllFacilities] = useState(false);
    const [showAllPropertyFacilities, setShowAllPropertyFacilities] = useState(false);

    // --- LIGHTBOX STATE ---
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // --- REAL-TIME STOCK STATE ---
    const [realTimeStock, setRealTimeStock] = useState<Record<string, number>>({});
    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // --- MENGAMBIL DATA SINKRONISASI DARI URL (QUERY PARAMS) ---
    const searchParams = new URLSearchParams(location.search);
    const urlCheckIn = searchParams.get('checkIn');
    const urlCheckOut = searchParams.get('checkOut');

    const today = new Date().toISOString().split('T')[0];

    // Helper untuk mendapatkan tanggal esok hari dari suatu tanggal
    const getNextDay = (dateStr: string) => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const defaultCheckOut = getNextDay(today);

    // State lokal untuk menampung data pencarian
    const [checkIn, setCheckIn] = useState(urlCheckIn || today);
    const [checkOut, setCheckOut] = useState(urlCheckOut || defaultCheckOut);

    // Kalkulasi Total Malam
    const calculateNights = () => {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    };
    const totalNights = calculateNights();

    // 1. Fetch Data Properti Awal
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

    // 2. LOGIC BARU: Cek Stok Real-time ke Backend
    const checkAllRoomsAvailability = async () => {
        if (!property?.room_types) return;

        setIsCheckingStock(true);
        const newStocks: Record<string, number> = {};

        // Cek availability untuk setiap kamar secara parallel
        await Promise.all(property.room_types.map(async (r: any) => {
            try {
                const res = await api.get('/availability/check', {
                    params: {
                        room_type_id: r.id,
                        check_in: checkIn,
                        check_out: checkOut
                    }
                });
                newStocks[r.id] = res.data.available;
            } catch (err) {
                console.error("Gagal cek stok", err);
                newStocks[r.id] = 0; // Jika error, anggap habis biar aman
            }
        }));

        setRealTimeStock(newStocks);
        setIsCheckingStock(false);
    };

    // 3. Trigger Cek Stok saat Tanggal Berubah ATAU saat properti pertama kali di-load
    useEffect(() => {
        if (property && property.room_types && property.room_types.length > 0) {
            checkAllRoomsAvailability();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkIn, checkOut, property]);

    // 4. Hitung Harga Per Kamar berdasarkan total malam
    const calculateRoomPrice = (room: any) => {
        const basePrice = Number(room.price_daily) || Number(room.base_price) || 0;
        return basePrice * totalNights;
    };

    const formatRupiah = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    // 5. Handle Booking (Kirim data kamar yang dipilih)
    const handleBooking = (selectedRoom: any) => {
        navigate('/booking', {
            state: {
                room: selectedRoom,
                propertyName: property.name,
                preSelectedCheckIn: checkIn,
                preSelectedCheckOut: checkOut,
                totalPriceOverride: calculateRoomPrice(selectedRoom),
                totalNights: totalNights,
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

    // --- LIGHTBOX HELPERS ---
    const getAllImages = () => {
        const imgs: string[] = [];
        if (property?.image_url) imgs.push(property.image_url);
        if (property?.gallery_images?.length) imgs.push(...property.gallery_images);
        return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070'];
    };
    const openLightbox = (idx: number = 0) => { setLightboxIndex(idx); setShowLightbox(true); document.body.style.overflow = 'hidden'; };
    const closeLightbox = () => { setShowLightbox(false); document.body.style.overflow = ''; };
    const lightboxNext = () => { const all = getAllImages(); setLightboxIndex(i => (i + 1) % all.length); };
    const lightboxPrev = () => { const all = getAllImages(); setLightboxIndex(i => (i - 1 + all.length) % all.length); };


    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#FEFBF3]">
            <Loader2 className="animate-spin text-keenan-gold" size={40} />
        </div>
    );

    if (!property) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#FEFBF3] text-center p-4">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">Data tidak lengkap</h1>
            <p className="text-gray-500 mb-6">Properti tidak ditemukan.</p>
            <button onClick={() => navigate('/')} className="bg-keenan-dark text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-black transition-all">
                Back to Home
            </button>
        </div>
    );

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
                {/* Siapkan gallery images: gunakan gallery_images dari backend, atau fallback ke placeholder */}
                {(() => {
                    const galleryImages: string[] = property.gallery_images || [];
                    const placeholderImages = [
                        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070",
                        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070",
                        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070",
                        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070",
                    ];
                    // Isi gallery sampai 4 slot dengan placeholder jika kurang
                    const gridSmall: string[] = [];
                    for (let i = 0; i < 4; i++) {
                        gridSmall.push(galleryImages[i] || placeholderImages[i]);
                    }
                    return (
                        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
                            <div className="col-span-2 row-span-2 overflow-hidden">
                                <img
                                    src={property.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"}
                                    alt={property.name}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                            {gridSmall.map((img, idx) => (
                                <div key={idx} className="relative overflow-hidden group">
                                    <img
                                        src={img}
                                        alt={`View ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {idx === 3 && (
                                        <button
                                            onClick={() => openLightbox(0)}
                                            className="absolute bottom-3 right-3 bg-black/80 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 hover:bg-black transition-colors">
                                            <Camera size={12} /> Show all photos ({getAllImages().length})
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* --- PROPERTY TITLE --- */}
            <div className="container mx-auto max-w-7xl px-6 pb-6">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{property.name}</h1>
                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    {property.address}
                </p>
            </div>

            {/* --- SEARCH BAR (SYNCED & CENTERED) --- */}
            <div className="bg-[#F5E6C8] py-10">
                <div className="container mx-auto max-w-7xl px-6 flex justify-center">
                    <div className="bg-white flex flex-col md:flex-row overflow-hidden w-full max-w-4xl shadow-sm rounded-lg border-t-4 border-keenan-gold">

                        {/* Check In */}
                        <div className="flex-1 px-8 py-6 border-b md:border-b-0 md:border-r border-gray-200">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Check-In</p>
                            <input
                                type="date"
                                value={checkIn}
                                min={today}
                                onChange={(e) => {
                                    setCheckIn(e.target.value);
                                    // Cegah Check-Out berada di sebelum Check-In yang baru
                                    if (e.target.value >= checkOut) {
                                        setCheckOut(getNextDay(e.target.value));
                                    }
                                }}
                                className="text-lg font-serif text-gray-800 outline-none bg-transparent w-full cursor-pointer"
                            />
                        </div>

                        {/* Check Out */}
                        <div className="flex-1 px-8 py-6">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Check-Out</p>
                            <input
                                type="date"
                                value={checkOut}
                                min={getNextDay(checkIn)}
                                onChange={e => setCheckOut(e.target.value)}
                                className="text-lg font-serif text-gray-800 outline-none bg-transparent w-full cursor-pointer"
                            />
                        </div>

                    </div>
                </div>
            </div>

            {/* --- ROOM & RATES --- */}
            <div className="bg-[#FEFBF3] py-12">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">Room & Rates</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        {isCheckingStock ? "Sedang mengecek ketersediaan..." : "Pilih kamar yang tersedia untuk tanggal yang Anda tentukan"}
                    </p>

                    <div className="space-y-6">
                        {property.room_types.map((room: any) => {
                            // AMBIL STOK DARI STATE REAL-TIME
                            const currentStock = isCheckingStock ? 0 : (realTimeStock[room.id] ?? room.total_stock);
                            const isSoldOut = !isCheckingStock && currentStock === 0;

                            const visibleFacilities = showAllFacilities ? room.facilities : room.facilities?.slice(0, 4);

                            return (
                                <div key={room.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow relative">

                                    {/* Overlay Loading */}
                                    {isCheckingStock && (
                                        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                            <Loader2 className="animate-spin text-keenan-gold" />
                                        </div>
                                    )}

                                    {/* Room Image */}
                                    <div className="md:w-64 h-56 md:h-auto relative shrink-0 overflow-hidden group">
                                        <img
                                            src={room.image_url || "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070"}
                                            alt={room.name}
                                            className={`w-full h-full object-cover transition-transform duration-700 ${isSoldOut ? 'grayscale' : 'group-hover:scale-105'}`}
                                        />
                                        <button className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 text-white px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap hover:bg-black transition-colors">
                                            Show photos
                                        </button>
                                    </div>

                                    {/* Room Details */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="text-xl font-serif font-bold text-gray-900">{room.name}</h3>

                                                {/* BADGE STOK DINAMIS UPDATE */}
                                                {!isCheckingStock && (
                                                    isSoldOut ? (
                                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase tracking-wide ml-3">
                                                            ❌ Sold Out
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ml-3 whitespace-nowrap ${currentStock <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                                            {currentStock <= 3 ? `🔥 Sisa ${currentStock} Unit` : `✅ ${currentStock} Unit Tersedia`}
                                                        </span>
                                                    )
                                                )}
                                            </div>

                                            <p className="text-gray-400 text-xs mb-4 flex items-center gap-1.5">
                                                <Users size={12} /> {room.capacity} Guest{room.capacity > 1 ? 's' : ''}
                                            </p>

                                            {/* Facilities */}
                                            {room.facilities && room.facilities.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 mb-3">Facilities:</p>
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
                                                        {visibleFacilities.map((fac: string, i: number) => (
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
                                                            {showAllFacilities ? <><ChevronUp size={12} /> Hide facilities</> : <><ChevronDown size={12} /> Show all facilities</>}
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
                                                Total {totalNights} Malam
                                            </p>
                                            <p className="text-2xl font-bold font-serif text-gray-900">
                                                {formatRupiah(calculateRoomPrice(room))}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formatRupiah(Number(room.price_daily) || Number(room.base_price))} / malam
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleBooking(room)}
                                            disabled={isSoldOut || isCheckingStock}
                                            className={`mt-4 w-full px-6 py-3 font-bold uppercase text-xs tracking-widest transition-colors text-center min-w-[120px] rounded
                                                ${isSoldOut || isCheckingStock
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-keenan-gold hover:bg-keenan-dark text-white shadow-md'
                                                }`}
                                        >
                                            {isCheckingStock ? 'Checking...' : (isSoldOut ? 'Full Booked' : 'BOOK NOW')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- ABOUT SECTION --- */}
            <div className="bg-white py-12">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">About {property.name}</h2>
                    <p className="text-gray-600 leading-relaxed text-sm text-justify">
                        {property.description || "Rasakan kenyamanan menginap dengan fasilitas lengkap dan pelayanan terbaik."}
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

            {/* --- LOCATION (Interactive Map) --- */}
            <div className="bg-white py-12 border-t border-gray-100">
                <div className="container mx-auto max-w-7xl px-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Location</h2>
                    <p className="text-gray-500 text-sm mb-6 flex items-center gap-1.5">
                        <MapPin size={14} className="text-red-500 shrink-0" />
                        {property.address}
                    </p>
                    <InteractiveMap address={property.address} propertyName={property.name} />
                </div>
            </div>

            {/* --- GALLERY LIGHTBOX OVERLAY --- */}
            {showLightbox && (() => {
                const allImgs = getAllImages();
                return (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
                        onKeyDown={(e) => { if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowRight') lightboxNext(); if (e.key === 'ArrowLeft') lightboxPrev(); }}
                        tabIndex={0}
                    >
                        {/* Top Bar */}
                        <div className="flex justify-between items-center p-4 shrink-0">
                            <p className="text-white font-medium text-sm">{property.name} — <span className="text-gray-400">{lightboxIndex + 1} / {allImgs.length}</span></p>
                            <button onClick={closeLightbox} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        {/* Main Image */}
                        <div className="flex-1 flex items-center justify-center relative">
                            <button onClick={lightboxPrev} className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm">
                                <ChevronLeft size={28} />
                            </button>
                            <img
                                key={lightboxIndex}
                                src={allImgs[lightboxIndex]}
                                alt={`Photo ${lightboxIndex + 1}`}
                                className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                            />
                            <button onClick={lightboxNext} className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm">
                                <ChevronRight size={28} />
                            </button>
                        </div>
                        {/* Thumbnail Strip */}
                        <div className="flex gap-2 p-4 overflow-x-auto justify-center shrink-0">
                            {allImgs.map((img, idx) => (
                                <button key={idx} onClick={() => setLightboxIndex(idx)}
                                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === lightboxIndex ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-80'
                                        }`}
                                >
                                    <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default PropertyDetails;