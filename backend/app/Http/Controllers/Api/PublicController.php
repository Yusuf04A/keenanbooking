<?php

namespace App\Http\Controllers\Api; // <--- Namespace harus Api
use App\Models\Booking;
use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\RoomType;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function getProperties()
    {
        $properties = Property::with('roomTypes')->get();
        return response()->json($properties);
    }

    public function getPropertyDetail($id)
    {
        $property = Property::with('roomTypes')->find($id);

        if (!$property) {
            return response()->json(['message' => 'Property not found'], 404);
        }

        return response()->json($property);
    }

    public function getAllRooms()
    {
        $rooms = RoomType::with('property')->get();
        return response()->json($rooms);
    }
    public function checkAvailability(Request $request)
    {
        $request->validate([
            'room_type_id' => 'required',
            'check_in' => 'required|date',
            'check_out' => 'required|date',
        ]);

        // 1. Hitung berapa kamar yang TERPAKAI di tanggal tersebut
        $bookedCount = Booking::where('room_type_id', $request->room_type_id)
            ->whereIn('status', ['paid', 'confirmed', 'checked_in', 'pending'])
            ->where(function ($query) use ($request) {
                // Logika Tabrakan Tanggal
                $query->where('check_in_date', '<', $request->check_out)
                    ->where('check_out_date', '>', $request->check_in);
            })
            ->count();

        // 2. Ambil Total Stok Asli
        $room = RoomType::find($request->room_type_id);

        if (!$room)
            return response()->json(['available' => 0]);

        // 3. Hitung Sisa
        $available = $room->total_stock - $bookedCount;

        return response()->json([
            'room_type_id' => $room->id,
            'total_stock' => $room->total_stock,
            'booked' => $bookedCount,
            'available' => max($available, 0) // Pastikan gak minus
        ]);
    }
}