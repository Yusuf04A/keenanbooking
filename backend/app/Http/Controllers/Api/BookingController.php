<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\RoomType;
use Illuminate\Http\Request;
use Midtrans\Config;
use Midtrans\Snap;
use Illuminate\Support\Facades\Mail;
use App\Mail\BookingConfirmation;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class BookingController extends Controller
{
    public function __construct()
    {
        // Konfigurasi Midtrans
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
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

        // 2. CEK KETERSEDIAAN BERDASARKAN TANGGAL (Time-Based Inventory)
        // Kita hitung berapa booking yang "bentrok" di tanggal yang dipilih user

        $checkIn = $request->check_in_date;
        $checkOut = $request->check_out_date;

        $conflictingBookings = Booking::where('room_type_id', $request->room_type_id)
            ->whereIn('status', ['paid', 'confirmed', 'checked_in', 'pending']) // Pending juga dihitung biar gak rebutan saat bayar
            ->where(function ($query) use ($checkIn, $checkOut) {
            // Rumus Tabrakan Tanggal:
            // (Start A < End B) && (End A > Start B)
            $query->where('check_in_date', '<', $checkOut)
                ->where('check_out_date', '>', $checkIn);
        })
            ->count();

        // Ambil Kapasitas Asli Kamar (Misal: 5 kamar)
        $room = RoomType::find($request->room_type_id);

        if (!$room) {
            return response()->json(['message' => 'Tipe kamar tidak ditemukan.'], 404);
        }

        // Jika (Booking yang ada + 1 user ini) > Kapasitas, maka Penuh.
        if (($conflictingBookings + 1) > $room->total_stock) {
            return response()->json([
                'message' => 'Maaf, kamar penuh di tanggal yang Anda pilih. Silakan pilih tanggal lain.'
            ], 400);
        }

        // 3. Buat Kode Booking Unik
        $bookingCode = 'KNA-' . time() . rand(100, 999);

        // 4. Logika Token (Midtrans vs Manual)
        $snapToken = null;
        $isManual = $request->booking_source && strtolower($request->booking_source) !== 'website';

        try {
            if ($isManual) {
                // Jika input manual admin, buat token dummy aja (gak perlu ke Midtrans)
                $snapToken = 'MANUAL-' . time();
            }
            else {
                // Jika dari Website User, minta token beneran ke Midtrans
                $params = [
                    'transaction_details' => [
                        'order_id' => $bookingCode,
                        'gross_amount' => (int)$request->total_price,
                    ],
                    'customer_details' => [
                        'first_name' => $request->customer_name,
                        'email' => $request->customer_email,
                        'phone' => $request->customer_phone,
                    ],
                ];
                $snapToken = Snap::getSnapToken($params);
            }

            // 5. Simpan ke Database
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
                'status' => $isManual ? 'pending' : 'pending', // Manual nanti di-update jadi paid di frontend admin
                'snap_token' => $snapToken,
                'booking_source' => $request->booking_source ?? 'website',
            ]);

            return response()->json([
                'token' => $snapToken,
                'redirect_url' => "https://app.sandbox.midtrans.com/snap/v2/vtweb/" . $snapToken,
                'booking' => $booking
            ]);

        }
        catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Fungsi untuk update status setelah bayar (Midtrans Notification / Frontend Success)
    public function updateStatus(Request $request)
    {
        $booking = Booking::where('booking_code', $request->order_id)->first();

        if ($booking) {
            if ($booking->status !== 'paid') {
                $booking->update([
                    'status' => 'paid',
                    'payment_method' => $request->payment_type ?? 'manual'
                ]);

                // ❌ HAPUS LOGIKA DECREMENT STOK DISINI
                // Stok fisik tidak boleh berkurang permanen.
                // Ketersediaan sudah dijaga oleh logic tanggal di createTransaction.

                // Kirim Email
                try {
                    Mail::to($booking->customer_email)->send(new BookingConfirmation($booking));
                }
                catch (\Exception $e) {
                    Log::error("Gagal kirim email: " . $e->getMessage());
                }
            }
            return response()->json(['message' => 'Updated Successfully']);
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

    // Fungsi Update Status Manual oleh Staff (Check-in/Check-out/Cancel)
    public function updateManualStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required'
        ]);

        $booking = Booking::findOrFail($id);
        $booking->update(['status' => $request->status]);

        // --- TAMBAHAN: KIRIM EMAIL JIKA STATUS DIUBAH JADI PAID ---
        if ($request->status === 'paid') {
            try {
                // Pastikan class Mail diimport di atas: use Illuminate\Support\Facades\Mail;
                Mail::to($booking->customer_email)->send(new BookingConfirmation($booking));
            }
            catch (\Exception $e) {
                Log::error("Gagal kirim email manual: " . $e->getMessage());
            }
        }
        // ----------------------------------------------------------

        return response()->json(['message' => 'Status updated', 'booking' => $booking]);
    }

    /**
     * Generate dan download invoice PDF untuk booking tertentu.
     * Route: GET /api/bookings/{id}/invoice-pdf (publik)
     */
    public function downloadInvoice($id)
    {
        $booking = Booking::with(['property', 'roomType'])->findOrFail($id);

        // Hitung malam
        $checkIn = new \DateTime($booking->check_in_date);
        $checkOut = new \DateTime($booking->check_out_date);
        $nights = max(1, $checkIn->diff($checkOut)->days);

        // Format harga
        $formatted_price = 'Rp ' . number_format($booking->total_price, 0, ',', '.');

        $pdf = Pdf::loadView('pdf.invoice', compact('booking', 'nights', 'formatted_price'))
            ->setPaper('a4', 'portrait')
            ->setOption('defaultFont', 'helvetica')
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('isRemoteEnabled', false);

        $filename = 'invoice-' . $booking->booking_code . '.pdf';

        return $pdf->download($filename);
    }
}