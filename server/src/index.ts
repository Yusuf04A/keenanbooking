import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const midtransClient = require('midtrans-client');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Setup Midtrans
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// 2. Setup Supabase (Server Side)
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

app.get('/', (req, res) => {
    res.send('Keenan Server is Running! 🚀');
});

// API: Buat Token Transaksi
app.post('/api/midtrans/create-transaction', async (req: Request, res: Response) => {
    try {
        const { orderId, amount, customerDetails } = req.body;
        const parameter = {
            transaction_details: { order_id: orderId, gross_amount: amount },
            customer_details: {
                first_name: customerDetails.first_name,
                email: customerDetails.email,
                phone: customerDetails.phone
            }
        };
        const transaction = await snap.createTransaction(parameter);
        res.status(200).json({ token: transaction.token, redirect_url: transaction.redirect_url });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// --- API BARU: WEBHOOK NOTIFIKASI MIDTRANS ---
// Midtrans akan "menembak" URL ini secara otomatis setelah user bayar
app.post('/api/midtrans/notification', async (req: Request, res: Response) => {
    try {
        const statusResponse = await snap.transaction.notification(req.body);
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Menerima notifikasi untuk Order: ${orderId} | Status: ${transactionStatus}`);

        // Tentukan status baru untuk database
        let newStatus = '';

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                newStatus = 'pending_payment'; // Ditahan bank
            } else if (fraudStatus == 'accept') {
                newStatus = 'paid'; // Sukses (Kartu Kredit)
            }
        } else if (transactionStatus == 'settlement') {
            newStatus = 'paid'; // Sukses (Transfer Bank/QRIS)
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            newStatus = 'cancelled'; // Gagal
        } else if (transactionStatus == 'pending') {
            newStatus = 'pending_payment';
        }

        // Update ke Database Supabase
        if (newStatus) {
            const { error } = await supabase
                .from('bookings')
                .update({ status: newStatus })
                .eq('booking_code', orderId);

            if (error) {
                console.error("Gagal update database:", error);
                throw error;
            }
            console.log(`✅ Database updated: ${newStatus}`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Error processing notification');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});