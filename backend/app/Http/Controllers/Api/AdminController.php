<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Property;
use App\Models\RoomType;
use App\Models\Admin;
use Illuminate\Support\Str;
use App\Models\BookingPlatform;
use Illuminate\Support\Facades\Storage; // <--- WAJIB UNTUK DELETE & UPLOAD FILE

class AdminController extends Controller
{
    // ================= PROPERTY (HOTEL) =================
    public function storeProperty(Request $request)
    {
        $data = $request->validate([
            'name' => 'required',
            'address' => 'required',
            'description' => 'nullable',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072' // Max 3MB
        ]);

        $data['slug'] = Str::slug($data['name']);
        
        // Default Image
        $data['image_url'] = 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

        // Jika ada file yang di-upload
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('properties', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $prop = Property::create($data);
        return response()->json($prop);
    }

    public function updateProperty(Request $request, $id)
    {
        $prop = Property::findOrFail($id);
        
        $data = $request->validate([
            'name' => 'required',
            'address' => 'required',
            'description' => 'nullable',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072'
        ]);

        $data['slug'] = Str::slug($data['name']);

        // Handle Image Upload saat Edit
        if ($request->hasFile('image')) {
            // Hapus gambar lama jika ada di server lokal
            if ($prop->image_url && str_contains($prop->image_url, 'storage/properties/')) {
                $oldPath = str_replace(asset('storage/'), '', $prop->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            
            // Upload gambar baru
            $path = $request->file('image')->store('properties', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $prop->update($data);
        return response()->json($prop);
    }

    public function destroyProperty($id)
    {
        $prop = Property::findOrFail($id);
        
        // Hapus file gambar dari harddisk (kalau ada dan bukan link luar)
        if ($prop->image_url && str_contains($prop->image_url, 'storage/properties/')) {
            $oldPath = str_replace(asset('storage/'), '', $prop->image_url);
            Storage::disk('public')->delete($oldPath);
        }

        $prop->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ================= ROOMS (KAMAR) =================
    public function storeRoom(Request $request)
    {
        $data = $request->validate([
            'property_id' => 'required',
            'name' => 'required',
            'price_daily' => 'required|numeric',   
            'price_weekly' => 'nullable|numeric',  
            'price_monthly' => 'nullable|numeric', 
            'capacity' => 'required|numeric',
            'total_stock' => 'required|numeric',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'facilities' => 'nullable|array'
        ]);

        // Default Image
        $data['image_url'] = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304';

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('rooms', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $room = RoomType::create($data);
        return response()->json($room);
    }

    public function updateRoom(Request $request, $id)
    {
        $room = RoomType::findOrFail($id);
        
        $data = $request->validate([
            'property_id' => 'required',
            'name' => 'required',
            'price_daily' => 'required|numeric',
            'price_weekly' => 'nullable|numeric',
            'price_monthly' => 'nullable|numeric',
            'capacity' => 'required|numeric',
            'total_stock' => 'required|numeric',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'facilities' => 'nullable|array'
        ]);

        if ($request->hasFile('image')) {
            // Hapus gambar lama
            if ($room->image_url && str_contains($room->image_url, 'storage/rooms/')) {
                $oldPath = str_replace(asset('storage/'), '', $room->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            
            // Upload gambar baru
            $path = $request->file('image')->store('rooms', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $room->update($data);
        return response()->json($room);
    }

    public function destroyRoom($id)
    {
        $room = RoomType::findOrFail($id);
        
        if ($room->image_url && str_contains($room->image_url, 'storage/rooms/')) {
            $oldPath = str_replace(asset('storage/'), '', $room->image_url);
            Storage::disk('public')->delete($oldPath);
        }

        $room->delete();
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
        $updateData = $request->except(['password']); 

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
        $totalRevenue = \App\Models\Booking::where('status', 'paid')->sum('total_price');
        $totalBookings = \App\Models\Booking::count();

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'totalBookings' => $totalBookings
        ]);
    }

    public function indexPlatforms()
    {
        return response()->json(BookingPlatform::all());
    }

    public function storePlatform(Request $request)
    {
        $data = $request->validate(['name' => 'required']);
        $data['slug'] = \Illuminate\Support\Str::slug($data['name']);
        return response()->json(BookingPlatform::create($data));
    }

    public function destroyPlatform($id)
    {
        BookingPlatform::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}