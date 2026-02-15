import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Hotel, BedDouble, Users,
    Plus, Trash2, Edit, X, Loader2, ShieldCheck, UploadCloud, MapPin
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'rooms' | 'staff'>('overview');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // DATA STATES
    const [stats, setStats] = useState({ revenue: 0, bookings: 0, hotels: 0 });
    const [properties, setProperties] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [admins, setAdmins] = useState<any[]>([]);

    // FORM STATES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'property' | 'room' | 'staff' | ''>('');
    const [editingId, setEditingId] = useState<string | null>(null); // ID item yang sedang diedit
    const [formData, setFormData] = useState<any>({});

    // STATE GAMBAR & FASILITAS
    const [imageFile, setImageFile] = useState<File | null>(null);
    const facilityOptions = ["Wifi", "AC", "Breakfast", "TV", "Netflix", "Hot Water", "Parking", "Kitchen"];
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

    useEffect(() => {
        const role = localStorage.getItem('keenan_admin_role');
        if (role !== 'superadmin') {
            navigate('/admin/dashboard');
            return;
        }
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const { data: props } = await supabase.from('properties').select('*');
            const { data: roomData } = await supabase.from('room_types').select('*, properties(name)').order('property_id');
            const { data: staff } = await supabase.from('admins').select('*').neq('role', 'superadmin');
            const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });

            setProperties(props || []);
            setRooms(roomData || []);
            setAdmins(staff || []);
            setStats({ revenue: 0, bookings: count || 0, hotels: props?.length || 0 });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER FORMAT RUPIAH ---
    const formatRupiah = (price: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
    };

    const uploadImage = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${modalType}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('property-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('property-images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const createSlug = (name: string) => name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    // --- LOGIC SIMPAN (ADD / EDIT) ---
    const handleSave = async () => {
        setUploading(true);
        try {
            let imageUrl = formData.image_url;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            // 1. LOGIC PROPERTY
            if (modalType === 'property') {
                const payload = {
                    name: formData.name,
                    address: formData.address,
                    description: formData.description,
                    image_url: imageUrl,
                    slug: createSlug(formData.name)
                };

                if (editingId) {
                    await supabase.from('properties').update(payload).eq('id', editingId);
                    alert("✅ Hotel Berhasil Diupdate!");
                } else {
                    await supabase.from('properties').insert([payload]);
                    alert("✅ Hotel Berhasil Ditambah!");
                }
            }

            // 2. LOGIC ROOM
            if (modalType === 'room') {
                const payload = {
                    property_id: formData.property_id,
                    name: formData.name,
                    description: formData.description,
                    base_price: parseInt(formData.base_price),
                    capacity: parseInt(formData.capacity),
                    image_url: imageUrl,
                    facilities: selectedFacilities // Simpan Array Fasilitas
                };

                if (editingId) {
                    await supabase.from('room_types').update(payload).eq('id', editingId);
                    alert("✅ Kamar Berhasil Diupdate!");
                } else {
                    await supabase.from('room_types').insert([payload]);
                    alert("✅ Kamar Berhasil Ditambah!");
                }
            }

            // 3. LOGIC STAFF
            if (modalType === 'staff') {
                const payload = {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name,
                    role: 'admin',
                    scope: formData.scope
                };
                if (editingId) {
                    // Biasanya staff jarang diedit via sini, tapi kalau mau:
                    await supabase.from('admins').update(payload).eq('id', editingId);
                } else {
                    await supabase.from('admins').insert([payload]);
                }
                alert("✅ Data Staff Tersimpan!");
            }

            closeModal();
            fetchAllData();

        } catch (error: any) {
            alert("Gagal: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (table: string, id: string) => {
        if (!confirm("Yakin mau hapus data ini?")) return;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) fetchAllData();
        else alert("Gagal hapus: " + error.message);
    };

    // --- MODAL HANDLER ---
    const openModal = (type: 'property' | 'room' | 'staff', data: any = null) => {
        setModalType(type);
        setEditingId(data ? data.id : null); // Jika ada data, berarti mode EDIT
        setImageFile(null);

        if (data) {
            // Isi form dengan data yang mau diedit
            setFormData(data);
            if (type === 'room' && data.facilities) {
                setSelectedFacilities(data.facilities);
            } else {
                setSelectedFacilities([]);
            }
        } else {
            // Kosongkan form untuk mode ADD
            setFormData({});
            setSelectedFacilities([]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
    };

    const handleFacilityChange = (facility: string) => {
        if (selectedFacilities.includes(facility)) {
            setSelectedFacilities(selectedFacilities.filter(f => f !== facility));
        } else {
            setSelectedFacilities([...selectedFacilities, facility]);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('keenan_admin_token');
        navigate('/admin/login');
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-keenan-gold" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
            {/* SIDEBAR */}
            <div className="w-64 bg-keenan-dark text-white p-6 hidden md:block fixed h-full shadow-2xl z-10">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-keenan-gold rounded-full flex items-center justify-center mx-auto mb-3 text-keenan-dark"><ShieldCheck size={32} /></div>
                    <h2 className="text-xl font-serif font-bold text-white tracking-tight">Superadmin</h2>
                </div>
                <nav className="space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-keenan-gold text-keenan-dark font-bold' : 'text-gray-400 hover:bg-white/5'}`}><LayoutDashboard size={18} /> Dashboard</button>
                    <button onClick={() => setActiveTab('properties')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'properties' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Hotel size={18} /> Properties</button>
                    <button onClick={() => setActiveTab('rooms')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'rooms' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><BedDouble size={18} /> Rooms</button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:bg-white/5'}`}><Users size={18} /> Staff</button>
                </nav>
                <button onClick={handleLogout} className="absolute bottom-8 left-6 right-6 flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-900/20"><LogOut size={18} /> Logout</button>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 md:ml-64 p-8 lg:p-12">

                {/* --- TAB 1: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <h1 className="text-4xl font-serif font-bold text-keenan-dark mb-8">Welcome, Boss.</h1>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Properties</p>
                                <p className="text-4xl font-bold text-keenan-dark">{stats.hotels}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Total Bookings</p>
                                <p className="text-4xl font-bold text-keenan-gold">{stats.bookings}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Active Staff</p>
                                <p className="text-4xl font-bold text-blue-600">{admins.length}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: MANAGE PROPERTIES (HOTEL) --- */}
                {activeTab === 'properties' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Manage Properties</h2>
                            <button onClick={() => openModal('property')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add New Hotel</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {properties.map(prop => (
                                <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col h-full">
                                    <div className="h-40 bg-gray-200 relative">
                                        <img src={prop.image_url} className="w-full h-full object-cover" alt={prop.name} />
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg text-keenan-dark mb-1">{prop.name}</h3>
                                            <p className="text-sm text-gray-500 mb-4 truncate">{prop.address}</p>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                            {/* TOMBOL EDIT */}
                                            <button onClick={() => openModal('property', prop)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                            {/* TOMBOL DELETE */}
                                            <button onClick={() => handleDelete('properties', prop.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 3: MANAGE ROOMS & PRICES --- */}
                {activeTab === 'rooms' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Rooms & Pricing</h2>
                            <button onClick={() => openModal('room')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add Room Type</button>
                        </div>

                        {properties.map(prop => {
                            const hotelRooms = rooms.filter(r => r.property_id === prop.id);
                            if (hotelRooms.length === 0) return null;

                            return (
                                <div key={prop.id} className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Hotel size={18} /> {prop.name}</h3>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
                                                <tr>
                                                    <th className="p-4 pl-6">Room Name</th>
                                                    <th className="p-4">Capacity</th>
                                                    <th className="p-4">Base Price</th>
                                                    <th className="p-4 text-right pr-6">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {hotelRooms.map(room => (
                                                    <tr key={room.id} className="hover:bg-gray-50">
                                                        <td className="p-4 pl-6 font-bold text-keenan-dark">{room.name}</td>
                                                        <td className="p-4 text-gray-500">{room.capacity} Person</td>
                                                        <td className="p-4 font-bold text-keenan-dark">
                                                            {formatRupiah(room.base_price)} {/* FORMAT RUPIAH */}
                                                        </td>
                                                        <td className="p-4 pr-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => openModal('room', room)} className="text-blue-400 hover:text-blue-600 p-2"><Edit size={18} /></button>
                                                                <button onClick={() => handleDelete('room_types', room.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- TAB 4: MANAGE STAFF --- */}
                {activeTab === 'staff' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-keenan-dark">Staff Access Control</h2>
                            <button onClick={() => openModal('staff')} className="bg-keenan-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black"><Plus size={18} /> Add New Staff</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {admins.map(admin => (
                                <div key={admin.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">{admin.full_name.charAt(0)}</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('staff', admin)} className="text-gray-300 hover:text-blue-500"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete('admins', admin.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-keenan-dark">{admin.full_name}</h3>
                                        <p className="text-sm text-gray-400">{admin.email}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Assigned To</span>
                                        <span className="text-xs font-bold text-keenan-gold bg-keenan-gold/10 px-2 py-1 rounded">{admin.scope === 'all' ? 'All Branches' : admin.scope}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL FORMS DENGAN EDIT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-serif capitalize">
                                {editingId ? 'Edit' : 'Add New'} {modalType}
                            </h3>
                            <button onClick={closeModal}><X /></button>
                        </div>

                        {/* FORM: PROPERTY */}
                        {modalType === 'property' && (
                            <div className="space-y-4">
                                <input placeholder="Hotel Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                <input placeholder="Address" value={formData.address || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-keenan-gold transition-colors">
                                    <input type="file" id="propImg" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                    <label htmlFor="propImg" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500">
                                        <UploadCloud size={24} />
                                        <span className="text-sm font-bold">{imageFile ? imageFile.name : (formData.image_url ? "Change Image" : "Upload Image")}</span>
                                    </label>
                                </div>
                                <textarea placeholder="Description" value={formData.description || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                <button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE PROPERTY"}</button>
                            </div>
                        )}

                        {/* FORM: ROOM (SUDAH ADA FASILITAS) */}
                        {modalType === 'room' && (
                            <div className="space-y-4">
                                <select className="w-full p-3 border rounded-lg bg-white" value={formData.property_id || ''} onChange={e => setFormData({ ...formData, property_id: e.target.value })}>
                                    <option>Select Property</option>
                                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <input placeholder="Room Name" value={formData.name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Price (Rp)" value={formData.base_price || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, base_price: e.target.value })} />
                                    <input type="number" placeholder="Capacity" value={formData.capacity || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, capacity: e.target.value })} />
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-keenan-gold transition-colors">
                                    <input type="file" id="roomImg" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                    <label htmlFor="roomImg" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500">
                                        <UploadCloud size={24} />
                                        <span className="text-sm font-bold">{imageFile ? imageFile.name : (formData.image_url ? "Change Image" : "Upload Image")}</span>
                                    </label>
                                </div>
                                <textarea placeholder="Description" value={formData.description || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, description: e.target.value })} />

                                {/* FASILITAS DINAMIS */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Facilities</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {facilityOptions.map(fac => (
                                            <label key={fac} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input type="checkbox" checked={selectedFacilities.includes(fac)} onChange={() => handleFacilityChange(fac)} className="accent-keenan-gold" /> {fac}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={uploading} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold flex justify-center">{uploading ? <Loader2 className="animate-spin" /> : "SAVE ROOM"}</button>
                            </div>
                        )}

                        {/* FORM: STAFF */}
                        {modalType === 'staff' && (
                            <div className="space-y-4">
                                <input placeholder="Full Name" value={formData.full_name || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                                <input placeholder="Email" type="email" value={formData.email || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <input placeholder="Password" type="password" value={formData.password || ''} className="w-full p-3 border rounded-lg" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                <select className="w-full p-3 border rounded-lg bg-white" value={formData.scope || ''} onChange={e => setFormData({ ...formData, scope: e.target.value })}>
                                    <option value="">-- Assign to Branch --</option>
                                    {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                <button onClick={handleSave} className="w-full bg-keenan-gold text-white py-3 rounded-lg font-bold">{editingId ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}