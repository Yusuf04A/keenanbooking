<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Invoice #{{ $booking->booking_code }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #1a1a1a;
            background: #ffffff;
            line-height: 1.5;
        }

        /* ---- STRIPE ATAS ---- */
        .stripe-top {
            background-color: #1a1a1a;
            height: 8px;
            width: 100%;
        }

        /* ---- WRAPPER ---- */
        .wrapper {
            padding: 32px 40px 28px 40px;
        }

        /* ---- HEADER ---- */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .header-left h1 {
            font-size: 28px;
            font-weight: 900;
            color: #1a1a1a;
            letter-spacing: -0.5px;
        }
        .header-left p {
            font-size: 9px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 4px;
        }
        .header-right {
            text-align: right;
        }
        .header-right .company-name {
            font-size: 12px;
            font-weight: 900;
            color: #C5A059;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .header-right .company-address {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 4px;
            max-width: 180px;
            margin-left: auto;
            line-height: 1.4;
        }

        /* ---- INFO TAMU ---- */
        .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 24px;
        }
        .info-block {
            flex: 1;
        }
        .info-block.right {
            text-align: right;
        }
        .label {
            font-size: 8px;
            font-weight: 900;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 4px;
            margin-top: 12px;
        }
        .label:first-child { margin-top: 0; }
        .value-name {
            font-size: 13px;
            font-weight: 700;
            color: #1a1a1a;
        }
        .value {
            font-size: 11px;
            color: #475569;
        }

        /* ---- TABEL ---- */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        thead tr {
            border-bottom: 2px solid #f1f5f9;
        }
        th {
            font-size: 8px;
            font-weight: 900;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 8px 0;
        }
        th.left  { text-align: left; }
        th.center { text-align: center; }
        th.right  { text-align: right; }
        tbody tr {
            border-bottom: 1px solid #f8fafc;
        }
        td {
            padding: 14px 0;
            vertical-align: top;
        }
        td.center { text-align: center; }
        td.right  { text-align: right; }
        .td-desc-title {
            font-weight: 700;
            color: #1a1a1a;
            font-size: 12px;
        }
        .td-desc-sub {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 2px;
        }
        .td-period {
            font-size: 10px;
            color: #475569;
            line-height: 1.6;
        }
        .td-period .sep { color: #cbd5e1; }

        /* ---- SUBTOTAL BOX ---- */
        .totals {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
        }
        .totals-box {
            width: 240px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 11px;
        }
        .totals-row .lbl { color: #64748b; }
        .totals-row .val { font-weight: 600; color: #1a1a1a; }
        .totals-total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background-color: #f8fafc;
            border-radius: 6px;
            margin-top: 6px;
        }
        .totals-total .lbl { font-weight: 900; font-size: 11px; color: #1a1a1a; }
        .totals-total .val { font-weight: 900; font-size: 13px; color: #C5A059; }

        /* ---- STATUS BADGE ---- */
        .badge {
            display: inline-block;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #15803d;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 5px 14px;
            border-radius: 999px;
            margin-bottom: 24px;
        }
        .badge-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #22c55e;
            margin-right: 5px;
            vertical-align: middle;
        }

        /* ---- FOOTER ---- */
        .footer {
            border-top: 1px solid #f1f5f9;
            padding-top: 18px;
            text-align: center;
        }
        .footer-title {
            font-size: 16px;
            font-style: italic;
            color: #cbd5e1;
            margin-bottom: 6px;
            font-family: Georgia, serif;
        }
        .footer-text {
            font-size: 8px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            line-height: 1.8;
        }

        /* ---- STRIPE BAWAH ---- */
        .stripe-bottom {
            background-color: #C5A059;
            height: 5px;
            width: 100%;
            margin-top: 28px;
        }
    </style>
</head>
<body>

    <div class="stripe-top"></div>

    <div class="wrapper">

        {{-- HEADER --}}
        <div class="header">
            <div class="header-left">
                <h1>INVOICE</h1>
                <p>#{{ $booking->booking_code }}</p>
            </div>
            <div class="header-right">
                <div class="company-name">KEENAN LIVING</div>
                <div class="company-address">{{ $booking->property->address ?? 'Yogyakarta, Indonesia' }}</div>
            </div>
        </div>

        {{-- INFO TAMU & TANGGAL --}}
        <div class="info-grid">
            <div class="info-block">
                <div class="label">Billed To</div>
                <div class="value-name">{{ $booking->customer_name }}</div>
                <div class="value">{{ $booking->customer_email }}</div>
                <div class="value">{{ $booking->customer_phone }}</div>
            </div>
            <div class="info-block right">
                <div class="label">Booking Date</div>
                <div class="value">{{ \Carbon\Carbon::parse($booking->created_at)->translatedFormat('d F Y') }}</div>

                <div class="label">Payment Method</div>
                <div class="value" style="font-weight:700; text-transform:uppercase;">
                    {{ $booking->payment_method ?? 'Virtual Account' }}
                </div>

                <div class="label">Status</div>
                <div class="value" style="font-weight:700; text-transform:uppercase; color:#15803d;">
                    LUNAS / PAID
                </div>
            </div>
        </div>

        {{-- TABEL ITEM --}}
        <table>
            <thead>
                <tr>
                    <th class="left">Description</th>
                    <th class="left">Period</th>
                    <th class="center">Nights</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="td-desc-title">{{ $booking->property->name ?? '-' }}</div>
                        <div class="td-desc-sub">{{ $booking->roomType->name ?? ($booking->room_type->name ?? '-') }}</div>
                    </td>
                    <td>
                        <div class="td-period">
                            {{ \Carbon\Carbon::parse($booking->check_in_date)->format('d/m/Y') }}<br>
                            <span class="sep">—</span><br>
                            {{ \Carbon\Carbon::parse($booking->check_out_date)->format('d/m/Y') }}
                        </div>
                    </td>
                    <td class="center" style="font-weight:600;">{{ $nights }}</td>
                    <td class="right" style="font-weight:700;">{{ $formatted_price }}</td>
                </tr>
            </tbody>
        </table>

        {{-- SUBTOTAL & TOTAL --}}
        <div class="totals">
            <div class="totals-box">
                <div class="totals-row">
                    <span class="lbl">Subtotal</span>
                    <span class="val">{{ $formatted_price }}</span>
                </div>
                <div class="totals-row">
                    <span class="lbl">Tax & Service</span>
                    <span class="val">Included</span>
                </div>
                <div class="totals-total">
                    <span class="lbl">TOTAL PAID</span>
                    <span class="val">{{ $formatted_price }}</span>
                </div>
            </div>
        </div>

        {{-- STATUS BADGE --}}
        <div>
            <span class="badge">
                <span class="badge-dot"></span>
                LUNAS / PAID
            </span>
        </div>

        {{-- FOOTER --}}
        <div class="footer">
            <div class="footer-title">Thank You!</div>
            <div class="footer-text">
                Dokumen ini diterbitkan secara otomatis oleh sistem dan sah tanpa tanda tangan basah.<br>
                Keenan Living Management System &copy; {{ date('Y') }}
            </div>
        </div>

    </div>

    <div class="stripe-bottom"></div>

</body>
</html>
