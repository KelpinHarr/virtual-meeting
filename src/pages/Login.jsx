import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { login, register, guestJoin, getStoredUser, formatErrorMessage } from '../services/api';
import ErrorModal from '../components/ErrorModal';

export default function Login({ guestMode = false, initialTab = 'login' }) {
  const navigate = useNavigate();
  const { sessionCode: urlCode } = useParams();

  // Tab mode: 'login' | 'register' | 'guest'
  const [tab, setTab] = useState(guestMode ? 'guest' : initialTab);
  const [loading, setLoading] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('speaker');
  const [sessionCode, setSessionCode] = useState(urlCode || '');

  const showError = (title, err, defaultMsg) => {
    const formatted = formatErrorMessage(err, defaultMsg);
    setErrorModal({
      isOpen: true,
      title,
      message: formatted,
    });
  };

  const closeError = () => {
    setErrorModal({ isOpen: false, title: '', message: '' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      showError('Login Gagal', err, 'Email atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create user account
      await register({
        email,
        password,
        display_name: displayName || email.split('@')[0],
        role,
      });

      // 2. Automatically log in with new credentials
      await login(email, password);

      // 3. Smooth redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      showError('Registrasi Gagal', err, 'Gagal mendaftarkan akun baru. Periksa data yang Anda masukkan.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await guestJoin(displayName, sessionCode);
      navigate(`/room/${data.session_code}`);
    } catch (err) {
      showError('Gagal Bergabung', err, 'Kode sesi tidak valid atau sesi telah berakhir.');
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated and not in guest mode, redirect safely using Navigate component
  const user = getStoredUser();
  if (user && user.role !== 'guest' && !guestMode && tab !== 'guest') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeError}
      />

      <div className="w-full max-w-md">
        {/* Logos & Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 bg-white/80 backdrop-blur-sm py-3 px-6 rounded-2xl shadow-sm border border-navy-100 mx-auto w-fit">
            <img
              src="/logos/logo-aiml.png"
              alt="AIML Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="h-7 w-[1.5px] bg-navy-200" />
            <img
              src="/logos/logo-gdg.png"
              alt="Google Developer Group Surabaya"
              className="h-7 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">MeetAudio</h1>
          <p className="text-navy-500 mt-1 text-sm font-medium">
            Virtual Meeting & Audio Streaming Platform
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-2xl bg-navy-100 p-1 mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'login'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-500 hover:text-navy-900'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'register'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-500 hover:text-navy-900'
            }`}
          >
            Daftar
          </button>
          <button
            type="button"
            onClick={() => setTab('guest')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              tab === 'guest'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-500 hover:text-navy-900'
            }`}
          >
            Tamu
          </button>
        </div>

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="card space-y-4 shadow-md border border-navy-100">
            <div>
              <h2 className="text-lg font-bold text-navy-900 mb-0.5">Masuk ke Akun Anda</h2>
              <p className="text-xs text-navy-500">Gunakan email dan password terdaftar Anda</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3 font-bold" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
            </button>
            <p className="text-center text-xs text-navy-500 mt-2">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => setTab('register')}
                className="text-primary-600 hover:underline font-bold"
              >
                Daftar sekarang
              </button>
            </p>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="card space-y-4 shadow-md border border-navy-100">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Buat Akun Baru</h2>
              <p className="text-xs text-navy-500">Daftar untuk mengakses speaker room dan dashboard meeting</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="speaker@meeting.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Nama Tampilan</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nama lengkap atau panggilan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">
                Password <span className="text-xs font-normal text-gray-400">(min. 6 karakter)</span>
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Peran Akun</label>
              <select
                className="input-field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">User Biasa (Peserta)</option>
                <option value="speaker">Speaker (Presenter Meeting)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full py-3 font-bold" disabled={loading}>
              {loading ? 'Mendaftarkan...' : 'Daftar & Masuk Dashboard'}
            </button>
            <p className="text-center text-xs text-navy-500 mt-2">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-primary-600 hover:underline font-bold"
              >
                Masuk di sini
              </button>
            </p>
          </form>
        )}

        {/* Guest Join Form */}
        {tab === 'guest' && (
          <form onSubmit={handleGuestJoin} className="card space-y-4 shadow-md border border-navy-100">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Gabung sebagai Tamu</h2>
              <p className="text-xs text-navy-500">Cukup masukkan nama dan kode sesi tanpa perlu login</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Nama Anda</label>
              <input
                type="text"
                className="input-field"
                placeholder="Masukkan nama Anda"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1">Kode Sesi Meeting</label>
              <input
                type="text"
                className="input-field uppercase tracking-widest text-center text-lg font-bold font-mono text-primary-700 bg-primary-50/50"
                placeholder="ABCD1234"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
            </div>
            <button type="submit" className="btn-success w-full py-3 font-bold" disabled={loading}>
              {loading ? 'Memproses...' : 'Gabung Sesi Meeting'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

