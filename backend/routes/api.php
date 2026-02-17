<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\BookingController;

// Rute Publik (Tanpa Login)
Route::get('/properties', [PublicController::class, 'getProperties']);
Route::get('/properties/{id}', [PublicController::class, 'getPropertyDetail']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/midtrans/create-transaction', [BookingController::class, 'createTransaction']);
Route::post('/bookings/update-status', [BookingController::class, 'updateStatus']);

// Rute Admin (Perlu Login)
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user(); });

    // Dashboard Read
    Route::get('/admin/bookings', [BookingController::class, 'index']);
    Route::get('/admin/rooms', [PublicController::class, 'getAllRooms']); // Dropdown

    // CRUD Property
    Route::post('/admin/properties', [\App\Http\Controllers\Api\AdminController::class, 'storeProperty']);
    Route::put('/admin/properties/{id}', [\App\Http\Controllers\Api\AdminController::class, 'updateProperty']);
    Route::delete('/admin/properties/{id}', [\App\Http\Controllers\Api\AdminController::class, 'destroyProperty']);

    // CRUD Rooms
    Route::post('/admin/rooms', [\App\Http\Controllers\Api\AdminController::class, 'storeRoom']);
    Route::put('/admin/rooms/{id}', [\App\Http\Controllers\Api\AdminController::class, 'updateRoom']);
    Route::delete('/admin/rooms/{id}', [\App\Http\Controllers\Api\AdminController::class, 'destroyRoom']);

    // CRUD Staff
    Route::get('/admin/staff', [\App\Http\Controllers\Api\AdminController::class, 'indexStaff']);
    Route::post('/admin/staff', [\App\Http\Controllers\Api\AdminController::class, 'storeStaff']);
    Route::put('/admin/staff/{id}', [\App\Http\Controllers\Api\AdminController::class, 'updateStaff']);
    Route::delete('/admin/staff/{id}', [\App\Http\Controllers\Api\AdminController::class, 'destroyStaff']);

    // Stats
    Route::get('/admin/stats', [\App\Http\Controllers\Api\AdminController::class, 'getStats']);

    Route::put('/admin/bookings/{id}/status', [BookingController::class, 'updateManualStatus']);
});