<!DOCTYPE html>
<html>

<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }

        .header {
            background-color: #1A1A1A;
            color: #C5A059;
            padding: 20px;
            text-align: center;
        }

        .content {
            padding: 20px;
        }

        .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }

        .footer {
            background-color: #eee;
            padding: 10px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }

        .button {
            display: inline-block;
            background-color: #C5A059;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
            <p>Halo <strong>{{ $booking->customer_name }}</strong>,</p>
            <p>Terima kasih telah memilih Keenan Living. Pesanan Anda telah kami terima dan pembayaran berhasil
                dikonfirmasi.</p>

            <div class="details">
                <p><strong>Kode Booking:</strong> {{ $booking->booking_code }}</p>
                <p><strong>Tipe Kamar:</strong> {{ $booking->roomType->name ?? 'Kamar Hotel' }}</p>
                <p><strong>Check-in:</strong> {{ date('d F Y', strtotime($booking->check_in_date)) }}</p>
                <p><strong>Check-out:</strong> {{ date('d F Y', strtotime($booking->check_out_date)) }}</p>
                <p><strong>Total Bayar:</strong> Rp {{ number_format($booking->total_price, 0, ',', '.') }}</p>
            </div>

            <p>Silakan tunjukkan email ini kepada resepsionis saat check-in.</p>
            <br>
            <center>
                <a href="#" class="button">Lihat Detail Pesanan</a>
            </center>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Keenan Living Hotel. All rights reserved.
        </div>
    </div>
</body>

</html>