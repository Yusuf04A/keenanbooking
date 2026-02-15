import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BookingSearch from './pages/booking/BookingSearch';
import PropertyDetails from './pages/booking/PropertyDetails';
import BookingPage from './pages/booking/BookingPage';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import CalendarPage from './pages/admin/CalenderPage';
import InvoicePage from './pages/admin/Invoice';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';

const NotFound = () => <div className="p-10 text-center">404 - Halaman Tidak Ditemukan</div>;

// --- KOMPONEN SATPAM (PROTECTED ROUTE) ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('keenan_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTES (Bisa Diakses Siapapun) --- */}
        <Route path="/" element={<BookingSearch />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/booking" element={<BookingPage />} />

        {/* 🔥 PERBAIKAN: Invoice ditaruh sini (Tanpa ProtectedRoute) */}
        {/* Supaya setelah bayar, user bisa langsung diarahkan kesini */}
        <Route path="/admin/invoice/:id" element={<InvoicePage />} />


        {/* --- ADMIN AUTH --- */}
        <Route path="/admin/login" element={<AdminLogin />} />


        {/* --- PROTECTED ROUTES (Hanya Admin) --- */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/super-dashboard"  // <--- Ganti nama path biar keren
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;