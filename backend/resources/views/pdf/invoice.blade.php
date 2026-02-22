<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice #{{ $booking->booking_code }}</title>

    <style>
        /* ===============================
           PAGE SETUP (PRINT FRIENDLY)
        =============================== */
        @page {
            size: A4 portrait;
            margin: 60px 60px;
            /* Diperbesar biar nggak mepet */
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #1f2937;
            background: #ffffff;
            line-height: 1.5;
            padding: 20px 30px;
            /* Tambahan padding kiri kanan */
        }

        /* CONTAINER AGAR TIDAK FULL LEBAR */
        .container {
            max-width: 720px;
            margin: 0 auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        td {
            vertical-align: top;
        }

        /* COLORS */
        .text-gold {
            color: #C5A059;
        }

        .text-dark {
            color: #111827;
        }

        .text-gray {
            color: #6b7280;
        }

        .text-light-gray {
            color: #9ca3af;
        }

        .font-bold {
            font-weight: bold;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        /* HEADER */
        .header-container {
            border-bottom: 2px solid #111827;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }

        .header-title {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
        }

        .header-subtitle {
            font-size: 10px;
            color: #6b7280;
            margin-top: 4px;
        }

        .header-booking-label {
            font-size: 9px;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header-booking-code {
            font-size: 22px;
            font-family: monospace;
            font-weight: bold;
            color: #C5A059;
        }

        /* CARD */
        .card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 18px;
            page-break-inside: avoid;
        }

        .card-header {
            background-color: #f9fafb;
            padding: 10px 14px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #6b7280;
        }

        .card-body {
            padding: 14px;
        }

        /* BADGE */
        .badge-paid {
            background-color: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-block;
        }

        .label {
            font-size: 9px;
            color: #9ca3af;
            margin-bottom: 4px;
            text-transform: uppercase;
            font-weight: bold;
        }

        .value {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
        }

        .inner-box {
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 8px;
        }
    </style>
</head>

<body>

    <div class="container">

        <!-- HEADER -->
        <table class="header-container">
            <tr>
                <td width="60%">
                    <div class="header-title">INVOICE</div>
                    <div class="header-subtitle">
                        Rincian pesanan Anda. Simpan dokumen ini sebagai bukti.
                    </div>
                    <div style="margin-top: 10px; font-weight: bold; font-size: 11px;">
                        <span class="text-gold">
                            {{ $booking->property->name ?? 'Keenan Living' }}
                        </span> • Yogyakarta, Indonesia
                    </div>
                </td>
                <td width="40%" class="text-right">
                    <div class="header-booking-label">Booking Code</div>
                    <div class="header-booking-code">
                        {{ $booking->booking_code }}
                    </div>
                </td>
            </tr>
        </table>

        <!-- INFORMASI PEMESAN -->
        <div class="card">
            <div class="card-header">
                <table>
                    <tr>
                        <td>Informasi Pemesan</td>
                        <td class="text-right">
                            <span class="badge-paid">Paid</span>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="card-body">
                <table>
                    <tr>
                        <td width="33%">
                            <div class="label">Nama Tamu</div>
                            <div class="value">{{ $booking->customer_name }}</div>
                        </td>
                        <td width="33%">
                            <div class="label">Nomor WhatsApp</div>
                            <div class="value">{{ $booking->customer_phone }}</div>
                        </td>
                        <td width="34%">
                            <div class="label">Email</div>
                            <div class="value">{{ $booking->customer_email }}</div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- WAKTU MENGINAP -->
        <div class="card">
            <div class="card-header">Informasi Waktu Menginap</div>
            <div class="card-body">
                <table>
                    <tr>
                        <td width="48%">
                            <div class="inner-box">
                                <div class="label">Check-In</div>
                                <div class="value">
                                    {{ \Carbon\Carbon::parse($booking->check_in_date)->translatedFormat('l, d F Y') }}
                                </div>
                                <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
                                    14:00 WIB
                                </div>
                            </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%">
                            <div class="inner-box">
                                <div class="label">Check-Out</div>
                                <div class="value">
                                    {{ \Carbon\Carbon::parse($booking->check_out_date)->translatedFormat('l, d F Y') }}
                                </div>
                                <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
                                    12:00 WIB
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- DETAIL KAMAR -->
        <div class="card">
            <div class="card-header">Detail Kamar</div>
            <div class="card-body">

                <div style="font-size: 16px; font-weight: bold;">
                    {{ $booking->roomType->name ?? 'Kamar Hotel' }}
                </div>

                <div style="font-size: 11px; color: #6b7280; margin: 4px 0 14px;">
                    {{ $nights ?? 1 }} Malam • 1 Kamar
                </div>

                <table>
                    <tr>
                        <td width="48%">
                            <div class="inner-box">
                                <div class="label">Hotel</div>
                                <div class="value">
                                    {{ $booking->property->name ?? 'Keenan Living Hotel' }}
                                </div>
                            </div>
                        </td>
                        <td width="4%"></td>
                        <td width="48%">
                            <div class="inner-box">
                                <div class="label">Lokasi</div>
                                <div class="value">Yogyakarta</div>
                            </div>
                        </td>
                    </tr>
                </table>

            </div>
        </div>

        <!-- PEMBAYARAN -->
        <div class="card">
            <div class="card-header">Rincian Pembayaran</div>
            <div class="card-body">

                <table style="margin-bottom: 14px;">
                    <tr>
                        <td style="color: #6b7280;">Metode Bayar</td>
                        <td class="text-right font-bold">
                            {{ str_replace('_', ' ', $booking->payment_method ?? 'Bank Transfer') }}
                        </td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding-top: 6px;">Status</td>
                        <td class="text-right">
                            <span class="badge-paid">LUNAS</span>
                        </td>
                    </tr>
                </table>

                <table style="border-top: 2px solid #111827; padding-top: 12px;">
                    <tr>
                        <td style="font-weight: bold; color: #4b5563;">Total Bayar</td>
                        <td class="text-right text-gold" style="font-size: 18px; font-weight: bold;">
                            {{ $formatted_price ?? 'Rp ' . number_format($booking->total_price ?? 0, 0, ',', '.') }}
                        </td>
                    </tr>
                </table>

            </div>

            <div style="
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 12px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;">

                Dokumen ini sah dan diterbitkan oleh sistem pada
                {{ \Carbon\Carbon::parse($booking->created_at)->translatedFormat('d F Y') }}.
                <br>
                Tunjukkan Booking Code saat Check-in di resepsionis.
            </div>
        </div>

    </div>
</body>

</html>