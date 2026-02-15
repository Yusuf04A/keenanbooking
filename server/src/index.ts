import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// @ts-ignore
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// 1. Setup Supabase Admin (Bypass RLS)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.FRONTEND_URL || ''
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

app.use(bodyParser.json());

// 2. Setup Midtrans
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// LOG START
console.log("------------------------------------------------");
console.log("🚀 SERVER BACKEND STARTING...");
console.log(`📡 PORT: ${port}`);
console.log("🔑 Server Key Loaded:", process.env.MIDTRANS_SERVER_KEY ? "✅ YES" : "❌ NO");
console.log("🗄️ Supabase Admin Loaded:", process.env.SUPABASE_SERVICE_KEY ? "✅ YES" : "❌ NO");
console.log("------------------------------------------------");

// Endpoint Token (Yang tadi sudah kita buat)
app.post('/api/midtrans/token', async (req, res) => {
    try {
        const { order_id, gross_amount, customer_details, item_details } = req.body;
        console.log(`\n[PAYMENT REQUEST] Order: ${order_id} | Total: ${gross_amount}`);

        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(gross_amount)
            },
            credit_card: { secure: true },
            customer_details: customer_details,
            item_details: item_details
        };

        const transaction = await snap.createTransaction(parameter);
        console.log(`[PAYMENT SUCCESS] Token Created`);
        res.status(200).json({ token: transaction.token });

    } catch (error: any) {
        console.error("\n[PAYMENT ERROR] -----------------------------");
        console.error(error.message);
        res.status(500).json({ message: "Gagal memproses pembayaran", error: error.message });
    }
});

// === 3. ENDPOINT BARU: WEBHOOK NOTIFICATION ===
// Midtrans akan "menembak" URL ini kalau ada update status
app.post('/api/midtrans/notification', async (req, res) => {
    try {
        const notificationJson = req.body;

        // Cek status via library Midtrans (Verifikasi Signature otomatis)
        const statusResponse = await snap.transaction.notification(notificationJson);

        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`\n[WEBHOOK RECEIVED] Order: ${orderId} | Status: ${transactionStatus}`);

        // Tentukan Status Baru untuk Database
        let newStatus = '';

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                newStatus = 'challenge'; // Perlu tinjauan manual
            } else if (fraudStatus == 'accept') {
                newStatus = 'paid'; // Sukses Kartu Kredit
            }
        } else if (transactionStatus == 'settlement') {
            newStatus = 'paid'; // Sukses VA / E-Wallet / dll
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            newStatus = 'cancelled'; // Gagal
        } else if (transactionStatus == 'pending') {
            newStatus = 'pending_payment';
        }

        // Update ke Supabase
        if (newStatus) {
            const { data, error } = await supabaseAdmin
                .from('bookings')
                .update({
                    status: newStatus,
                    payment_method: statusResponse.payment_type
                })
                .eq('booking_code', orderId)
                .select(); // <--- TAMBAHKAN INI (Biar kita tahu data apa yang diupdate)

            if (error) {
                console.error("❌ Gagal Update Database:", error.message);
                throw error;
            }

            // CEK APAKAH ADA YANG DIUPDATE?
            if (data && data.length > 0) {
                console.log(`✅ SUKSES! Database Updated: ${orderId} -> ${newStatus}`);
                console.log("📄 Data di DB sekarang:", data[0].status); // Log status asli di DB
            } else {
                console.log(`⚠️ PERINGATAN: Tidak ada booking dengan ID ${orderId} di database!`);
                console.log("   (Mungkin order_id di Midtrans beda dengan di Supabase?)");
            }
        }

        res.status(200).send('OK'); // Wajib balas OK ke Midtrans

    } catch (error: any) {
        console.error("❌ Webhook Error:", error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});