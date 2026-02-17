<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\RoomType;
use Illuminate\Http\Request;
use Midtrans\Config;
use Midtrans\Snap;

class BookingController extends Controller
{
    public function __construct()
    {
        // Konfigurasi Midtrans
        // Pastikan isi MIDTRANS_SERVER_KEY di file .env backend kamu!
        Config::$serverKey = env('MIDTRANS_SERVER_KEY', 'Mid-server-h5YoGhS8iz33fiJILOIl6gWB');
        Config::$isProduction = false;
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    public function createTransaction(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'property_id' => 'required',
            'room_type_id' => 'required',
            'customer_name' => 'required',
            'customer_email' => 'required|email',
            'customer_phone' => 'required',
            'check_in_date' => 'required|date',
            'check_out_date' => 'required|date',
            'total_price' => 'required|numeric',
            'customer_notes' => 'nullable|string',
            'booking_source' => 'nullable|string'
        ]);

        // 2. Buat Kode Booking Unik
        $bookingCode = 'KNA-' . time() . rand(100, 999);

        // 3. Siapkan Parameter Midtrans
        $params = [
            'transaction_details' => [
                'order_id' => $bookingCode,
                'gross_amount' => (int) $request->total_price,
            ],
            'customer_details' => [
                'first_name' => $request->customer_name,
                'email' => $request->customer_email,
                'phone' => $request->customer_phone,
            ],
        ];

        try {
            // 4. Minta Token ke Midtrans
            $snapToken = Snap::getSnapToken($params);

            // 5. Simpan ke Database (Status: Pending)
            $booking = Booking::create([
                'property_id' => $request->property_id,
                'room_type_id' => $request->room_type_id,
                'booking_code' => $bookingCode,
                'check_in_date' => $request->check_in_date,
                'check_out_date' => $request->check_out_date,
                'total_price' => $request->total_price,
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'customer_notes' => $request->customer_notes,
                'status' => 'pending',
                'snap_token' => $snapToken,
                'booking_source' => $request-> booking_source ?? 'Website', 
            ]);

            return response()->json([
                'token' => $snapToken,
                'redirect_url' => "https://app.sandbox.midtrans.com/snap/v2/vtweb/" . $snapToken,
                'booking' => $booking
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Fungsi untuk update status setelah bayar (Webhook/Manual)
    public function updateStatus(Request $request)
    {
        $booking = Booking::where('booking_code', $request->order_id)->first();
        if ($booking) {
            $booking->update([
                'status' => 'paid',
                'payment_method' => $request->payment_type
            ]);
            return response()->json(['message' => 'Updated']);
        }
        return response()->json(['message' => 'Not Found'], 404);
    }

    // Fungsi buat Admin Dashboard melihat list booking
    public function index()
    {
        // Ambil booking + nama property + nama kamar
        $bookings = Booking::with(['property', 'roomType'])->latest()->get();
        return response()->json($bookings);
    }

    public function updateManualStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required' // checked_in, checked_out, cancelled
        ]);

        $booking = Booking::findOrFail($id);
        $booking->update(['status' => $request->status]);

        return response()->json(['message' => 'Status updated', 'booking' => $booking]);
    }
}