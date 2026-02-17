<!DOCTYPE html>
<html>

<head>
    <title>Booking Confirmation</title>
</head>

<body>
    <h1>Terima Kasih, {{ $booking->customer_name }}!</h1>
    <p>Booking Anda telah kami terima.</p>
    <p>Kode Booking: <strong>{{ $booking->booking_code }}</strong></p>
    <p>Total: Rp {{ number_format($booking->total_price) }}</p>
    <br>
    <p>Silakan tunjukkan email ini saat check-in.</p>
</body>

</html>