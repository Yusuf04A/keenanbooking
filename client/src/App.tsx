import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BookingSearch from './pages/booking/BookingSearch';
import PropertyDetails from './pages/booking/PropertyDetails';
import BookingPage from './pages/booking/BookingPage';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

const NotFound = () => <div className="p-10 text-center">404 - Halaman Tidak Ditemukan</div>;

// --- KOMPONEN SATPAM (PROTECTED ROUTE) ---
// Tugasnya ngecek: "Kamu punya tiket admin gak?"
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('keenan_admin_token');

  if (!token) {
    // Kalau gak punya tiket, tendang ke halaman login
    return <Navigate to="/admin/login" replace />;
  }

  // Kalau punya, silakan masuk
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC (Siapapun boleh masuk) */}
        <Route path="/" element={<BookingSearch />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/booking" element={<BookingPage />} />

        {/* ADMIN (Harus Login Dulu) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* DASHBOARD DIPROTEKSI */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;