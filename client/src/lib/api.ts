import axios from 'axios';

// ⚠️ PENTING: Ganti URL ini sesuai alamat Laravel kamu
// Kalau pakai 'php artisan serve', biasanya: http://127.0.0.1:8000/api
// Kalau pakai Laragon (Pretty URL), mungkin: http://keenan-booking.test/api
const BASE_URL = 'http://127.0.0.1:8000/api';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor untuk otomatis nempel token Admin (kalau ada)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('keenan_admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});