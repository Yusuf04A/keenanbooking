import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface BookingFormProps {
    isOpen: boolean;
    onClose: () => void;
    room: any;          // Data kamar yang dipilih
    checkIn: string;
    checkOut: string;
    guests: number;
}

// Definisi Window.snap biar TypeScript gak marah
declare global {
    interface Window {
        snap: any;
    }
}

export const BookingFormModal = ({ isOpen, onClose, room, checkIn, checkOut, guests }: BookingFormProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });

    if (!isOpen) return null;

    // Hitung Total Hari & Harga
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = room.base_price * diffDays;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. GENERATE ORDER ID UNIK (KNA-TIMESTAMP-RANDOM)
            const orderId = `KNA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // 2. SIMPAN KE SUPABASE (Status: Pending)
            const { error: dbError } = await supabase.from('bookings').insert({
                booking_code: orderId,
                property_id: room.property_id,
                room_type_id: room.id,
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                customer_notes: formData.notes,
                check_in_date: checkIn,
                check_out_date: checkOut,
                total_guests: guests,
                total_price: totalPrice,
                status: 'pending_payment'
            });

            if (dbError) throw dbError;

            // 3. MINTA TOKEN KE BACKEND NODE.JS KITA
            const response = await fetch(`${import.meta.env.VITE_API_URL}/midtrans/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    gross_amount: totalPrice,
                    customer_details: {
                        first_name: formData.name,
                        email: formData.email,
                        phone: formData.phone
                    },
                    item_details: [{
                        id: room.id,
                        price: totalPrice,
                        quantity: 1,
                        name: `${room.name} (${diffDays} Nights)`
                    }]
                })
            });

            const data = await response.json();
            if (!data.token) throw new Error("Gagal mendapatkan token pembayaran");

            // 4. MUNCULKAN POPUP MIDTRANS SNAP
            window.snap.pay(data.token, {
                onSuccess: function (result: any) {
                    alert("Pembayaran Berhasil! Cek email anda.");
                    // TODO: Update status di Supabase jadi 'paid' (ideally via backend webhook)
                    // Untuk sekarang kita redirect aja
                    window.location.href = '/';
                },
                onPending: function (result: any) {
                    alert("Menunggu pembayaran...");
                    onClose();
                },
                onError: function (result: any) {
                    alert("Pembayaran Gagal!");
                    setLoading(false);
                },
                onClose: function () {
                    alert('Anda menutup popup tanpa menyelesaikan pembayaran');
                    setLoading(false);
                }
            });

        } catch (error: any) {
            alert("Error: " + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-keenan-gold p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Booking Confirmation</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                {/* Summary */}
                <div className="bg-keenan-cream p-4 border-b border-gray-100 text-sm">
                    <p className="font-bold text-keenan-dark">{room.name}</p>
                    <div className="flex justify-between mt-1 text-gray-600">
                        <span>{diffDays} Malam x Rp {room.base_price.toLocaleString()}</span>
                        <span className="font-bold text-keenan-gold">Total: Rp {totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name</label>
                        <input
                            required
                            type="text"
                            className="w-full border p-2 rounded outline-none focus:border-keenan-gold"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                className="w-full border p-2 rounded outline-none focus:border-keenan-gold"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp</label>
                            <input
                                required
                                type="tel"
                                className="w-full border p-2 rounded outline-none focus:border-keenan-gold"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes (Optional)</label>
                        <textarea
                            className="w-full border p-2 rounded outline-none focus:border-keenan-gold text-sm"
                            rows={2}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-keenan-dark text-white py-3 rounded font-bold uppercase tracking-widest hover:bg-keenan-gold transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Pay Now"}
                    </button>
                </form>

            </div>
        </div>
    );
};