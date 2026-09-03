import { Navigate } from 'react-router-dom';
import { getStoredUser } from '../services/api';

export default function ProtectedRoute({ roles, children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
