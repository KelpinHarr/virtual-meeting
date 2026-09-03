import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SpeakerRoom from './pages/SpeakerRoom';
import ClientRoom from './pages/ClientRoom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-navy-50 text-navy-900 selection:bg-purple-200 selection:text-purple-900">
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login initialTab="login" />} />
            <Route path="/register" element={<Login initialTab="register" />} />
            <Route path="/join" element={<Login guestMode />} />
            <Route path="/join/:sessionCode" element={<Login guestMode />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['admin', 'speaker', 'user']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/speaker/:sessionCode"
              element={
                <ProtectedRoute roles={['admin', 'speaker']}>
                  <SpeakerRoom />
                </ProtectedRoute>
              }
            />

            {/* Client room */}
            <Route path="/room/:sessionCode" element={<ClientRoom />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
