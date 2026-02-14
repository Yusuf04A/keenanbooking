import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingSearch from './pages/booking/BookingSearch';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

// Placeholder Component kalau file belum dibuat
const NotFound = () => <div className="p-10 text-center">404 - Halaman Tidak Ditemukan</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === PUBLIC ROUTES (CUSTOMER) === */}
        <Route path="/" element={<BookingSearch />} />

        {/* === PRIVATE ROUTES (ADMIN) === */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;