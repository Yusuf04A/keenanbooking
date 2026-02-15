// src/lib/fonnte.ts

// GANTI INI DENGAN TOKEN FONNTE KAMU
const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;

export const sendWhatsAppInvoice = async (
    target: string,
    guestName: string,
    bookingCode: string,
    hotelName: string,
    roomName: string,
    checkIn: string,
    checkOut: string,
    totalPrice: number,
    pdfUrl: string
) => {
    try {
        // 1. FORMAT NOMOR HP (PENTING!)
        // Hapus spasi, strip, dan +
        let formattedTarget = target.replace(/[^0-9]/g, '');

        // Kalau diawali 62, biarkan. Kalau 08, ganti jadi 628.
        if (formattedTarget.startsWith('08')) {
            formattedTarget = '62' + formattedTarget.substring(1);
        }

        console.log("Mengirim WA ke:", formattedTarget);

        // 2. BUAT PESAN YANG RAPI
        const message = `
*INVOICE BOOKING - KEENAN LIVING*
--------------------------------
Halo, *${guestName}*! 👋
Terima kasih telah melakukan reservasi.

Berikut detail pesanan Anda:

🔖 *Kode Booking:* ${bookingCode}
🏨 *Hotel:* ${hotelName}
🛏️ *Kamar:* ${roomName}
📅 *Check-in:* ${checkIn}
📅 *Check-out:* ${checkOut}

💰 *Total Paid:* Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}
✅ *Status:* LUNAS (Confirmed)

--------------------------------
Simpan pesan ini sebagai bukti reservasi saat Check-in.
Terima kasih telah memilih Keenan Living!
`;

        // 3. KIRIM KE API FONNTE
        const formData = new FormData();
        formData.append('target', formattedTarget);
        formData.append('message', message);
        formData.append('countryCode', '62'); // Default Indonesia

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': FONNTE_TOKEN
            },
            body: formData
        });

        const result = await response.json();
        console.log("Fonnte Response:", result);

        if (!result.status) {
            throw new Error("Gagal kirim WA");
        }

        return true;

    } catch (error) {
        console.error("Error sending WhatsApp:", error);
        return false; // Biar aplikasi gak crash walau WA gagal
    }
};