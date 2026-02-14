import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookingSearch from './pages/booking/BookingSearch';
import PropertyDetails from './pages/booking/PropertyDetails'; // <--- Import baru
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

const NotFound = () => <div className="p-10 text-center">404 - Halaman Tidak Ditemukan</div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<BookingSearch />} />
        <Route path="/property/:id" element={<PropertyDetails />} /> {/* <--- Route Baru */}

        {/* ADMIN */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;