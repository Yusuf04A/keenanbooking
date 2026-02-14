import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// @ts-ignore (Kadang library midtrans types-nya belum sempurna)
import midtransClient from 'midtrans-client';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL, // Hanya izinkan frontend kita
    methods: ['GET', 'POST']
}));
app.use(bodyParser.json());

// Setup Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: false, // Pakai Sandbox
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// 1. Endpoint: Buat Token Transaksi
app.post('/api/midtrans/token', async (req, res) => {
    try {
        const { order_id, gross_amount, customer_details, item_details } = req.body;

        console.log("Menerima request payment:", order_id);

        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: gross_amount
            },
            credit_card: {
                secure: true
            },
            customer_details: customer_details,
            item_details: item_details
        };

        const transaction = await snap.createTransaction(parameter);

        // Kirim token ke frontend
        res.status(200).json({ token: transaction.token });

    } catch (error) {
        console.error("Midtrans Error:", error);
        res.status(500).json({ message: "Gagal memproses pembayaran" });
    }
});

// Jalankan Server
app.listen(port, () => {
    console.log(`🚀 Server Backend jalan di http://localhost:${port}`);
});