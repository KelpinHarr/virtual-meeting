import { Link, useNavigate } from 'react-router-dom';
import { getStoredUser, logout } from '../services/api';

export default function Navbar() {
  const user = getStoredUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-navy-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3 group">
            {/* Logos */}
            <div className="flex items-center gap-2.5">
              <img
                src="/logos/logo-aiml.png"
                alt="AIML Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="h-6 w-[1.5px] bg-navy-200 hidden sm:block" />
              <img
                src="/logos/logo-gdg.png"
                alt="Google Developer Group Surabaya"
                className="h-6 w-auto object-contain hidden sm:block transition-transform group-hover:scale-105"
              />
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-sm font-semibold text-navy-900 leading-tight">
                    {user.display_name || user.email}
                  </span>
                  <span className="text-[11px] text-gray-500">{user.email}</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : user.role === 'speaker'
                    ? 'bg-primary-100 text-primary-800 border border-primary-200'
                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                }`}>
                  {user.role}
                </span>

                {user.role !== 'guest' && (
                  <Link
                    to="/dashboard"
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Dashboard
                  </Link>
                )}

                {user.role !== 'guest' && (
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/join" className="btn-secondary text-xs sm:text-sm py-1.5 px-3">
                  Tamu
                </Link>
                <Link to="/login" className="btn-primary text-xs sm:text-sm py-1.5 px-4">
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
