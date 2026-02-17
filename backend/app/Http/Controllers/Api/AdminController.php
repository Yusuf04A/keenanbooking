<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\RoomType;
use App\Models\Admin;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    // ================= PROPERTY (HOTEL) =================
    public function storeProperty(Request $request)
    {
        $data = $request->validate([
            'name' => 'required',
            'address' => 'required',
            'description' => 'nullable',
            'image_url' => 'nullable'
        ]);
        $data['slug'] = Str::slug($data['name']);

        $prop = Property::create($data);
        return response()->json($prop);
    }

    public function updateProperty(Request $request, $id)
    {
        $prop = Property::findOrFail($id);
        $prop->update($request->all());
        return response()->json($prop);
    }

    public function destroyProperty($id)
    {
        Property::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }

    // ================= ROOMS (KAMAR) =================
    public function storeRoom(Request $request)
    {
        $data = $request->validate([
            'property_id' => 'required',
            'name' => 'required',
            'base_price' => 'required|numeric',
            'capacity' => 'required|numeric',
            'total_stock' => 'required|numeric',
            'image_url' => 'nullable',
            'facilities' => 'nullable|array'
        ]);

        $room = RoomType::create($data);
        return response()->json($room);
    }

    public function updateRoom(Request $request, $id)
    {
        $room = RoomType::findOrFail($id);
        $room->update($request->all());
        return response()->json($room);
    }

    public function destroyRoom($id)
    {
        RoomType::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }

    // ================= STAFF (ADMINS) =================
    public function indexStaff()
    {
        return response()->json(Admin::where('role', '!=', 'superadmin')->get());
    }

    public function storeStaff(Request $request)
    {
        $data = $request->validate([
            'full_name' => 'required',
            'email' => 'required|email|unique:admins',
            'password' => 'required',
            'scope' => 'required'
        ]);

        $data['password'] = bcrypt($data['password']);
        $data['role'] = 'admin';

        $admin = Admin::create($data);
        return response()->json($admin);
    }

    public function updateStaff(Request $request, $id)
    {
        $admin = Admin::findOrFail($id);
        $updateData = $request->except(['password']); // Jangan update password kalau kosong

        if ($request->filled('password')) {
            $updateData['password'] = bcrypt($request->password);
        }

        $admin->update($updateData);
        return response()->json($admin);
    }

    public function destroyStaff($id)
    {
        Admin::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }

    // ================= DASHBOARD STATS =================
    public function getStats()
    {
        // Hitung manual sederhana
        $totalRevenue = \App\Models\Booking::where('status', 'paid')->sum('total_price');
        $totalBookings = \App\Models\Booking::count();

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'totalBookings' => $totalBookings
        ]);
    }
}