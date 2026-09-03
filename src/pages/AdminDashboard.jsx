import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSchedules, createSchedule, deleteSchedule,
  getSessions, createSession,
  register, getStoredUser, formatErrorMessage,
} from '../services/api';
import SessionCard from '../components/SessionCard';
import ErrorModal from '../components/ErrorModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const isAdmin = user?.role === 'admin';
  const isSpeaker = user?.role === 'speaker';
  const isUser = user?.role === 'user' || (!isAdmin && !isSpeaker);

  const [tab, setTab] = useState(isUser ? 'sessions' : 'schedules');
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const showError = (title, err, fallback) => {
    const msg = formatErrorMessage(err, fallback);
    setError(msg);
    setErrorModal({
      isOpen: true,
      title,
      message: msg,
    });
  };

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
  });

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ schedule_id: '', speaker_id: '' });

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '', display_name: '', password: '', role: 'speaker',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, sess] = await Promise.all([getSchedules(), getSessions()]);
      setSchedules(s || []);
      setSessions(sess || []);
    } catch (err) {
      showError('Gagal Memuat Data', err, 'Gagal mengambil data jadwal dan sesi dari server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await createSchedule(scheduleForm);
      setSuccess('Jadwal berhasil dibuat!');
      setShowScheduleForm(false);
      setScheduleForm({ title: '', description: '', start_time: '', end_time: '' });
      loadData();
    } catch (err) {
      setShowScheduleForm(false);
      showError('Gagal Membuat Jadwal', err, 'Terjadi kesalahan saat menyimpan jadwal.');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await deleteSchedule(id);
      setSuccess('Jadwal dihapus');
      loadData();
    } catch (err) {
      showError('Gagal Menghapus Jadwal', err, 'Terjadi kesalahan saat menghapus jadwal.');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await createSession({
        schedule_id: parseInt(sessionForm.schedule_id),
        speaker_id: parseInt(sessionForm.speaker_id),
      });
      setSuccess('Sesi berhasil dibuat!');
      setShowSessionForm(false);
      setSessionForm({ schedule_id: '', speaker_id: '' });
      loadData();
    } catch (err) {
      setShowSessionForm(false);
      showError('Gagal Membuat Sesi', err, 'Terjadi kesalahan saat membuat sesi baru.');
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await register(userForm);
      setSuccess(`User ${userForm.email} berhasil didaftarkan!`);
      setShowUserForm(false);
      setUserForm({ email: '', display_name: '', password: '', role: 'speaker' });
    } catch (err) {
      setShowUserForm(false);
      showError('Gagal Mendaftarkan User', err, 'Gagal menambahkan user baru. Periksa data yang dimasukkan.');
    }
  };

  const handleOpenSpeakerRoom = (session) => {
    navigate(`/speaker/${session.session_code}`);
  };

  const handleJoinClientRoom = (session) => {
    navigate(`/room/${session.session_code}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            {isAdmin && 'Dashboard Admin'}
            {isSpeaker && 'Dashboard Speaker'}
            {isUser && 'Dashboard Peserta'}
          </h1>
          <p className="text-xs text-navy-500 mt-1">
            Login sebagai: <span className="font-bold text-navy-900">{user?.display_name || user?.email}</span>{' '}
            <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider ${
              isAdmin
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : isSpeaker
                ? 'bg-primary-100 text-primary-800 border border-primary-200'
                : 'bg-teal-100 text-teal-800 border border-teal-200'
            }`}>
              {user?.role}
            </span>
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUserForm(true)} className="btn-purple text-sm">
            + Tambah User
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between items-center shadow-sm">
          <span className="whitespace-pre-line font-medium">{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-900 font-bold hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-sm flex justify-between items-center shadow-sm">
          <span className="font-semibold">✓ {success}</span>
          <button onClick={() => setSuccess('')} className="ml-2 text-teal-900 font-bold hover:text-teal-700">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-navy-100 p-1 mb-6 shadow-inner">
        {['schedules', 'sessions'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
              tab === t
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-500 hover:text-navy-900'
            }`}
          >
            {t === 'schedules' ? `Daftar Jadwal (${schedules.length})` : `Daftar Sesi (${sessions.length})`}
          </button>
        ))}
      </div>

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Daftar Jadwal Meeting</h2>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Buat jadwal meeting dan tetapkan pembicara' : 'Jadwal meeting yang terdaftar di platform'}
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowScheduleForm(true)} className="btn-primary text-sm">
                + Buat Jadwal
              </button>
            )}
          </div>

          {showScheduleForm && (
            <form onSubmit={handleCreateSchedule} className="card mb-6 space-y-3 border-2 border-primary-100">
              <h3 className="font-semibold text-gray-800">Buat Jadwal Baru</h3>
              <input
                className="input-field"
                placeholder="Judul meeting"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                required
              />
              <textarea
                className="input-field"
                placeholder="Deskripsi (opsional)"
                rows={2}
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Mulai</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Selesai</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary">Simpan Jadwal</button>
                <button type="button" onClick={() => setShowScheduleForm(false)} className="btn-secondary">Batal</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada jadwal yang tersedia.</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    {s.description && <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      📅 {new Date(s.start_time).toLocaleString('id-ID')} — {new Date(s.end_time).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    {(isAdmin || isSpeaker) && (
                      <button
                        onClick={() => {
                          setSessionForm({ schedule_id: s.id, speaker_id: user?.id || '' });
                          setShowSessionForm(true);
                        }}
                        className="btn-primary text-sm"
                      >
                        + Buat Sesi
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDeleteSchedule(s.id)} className="btn-danger text-sm">
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Daftar Sesi Meeting</h2>
              <p className="text-xs text-gray-500">
                {isUser ? 'Pilih sesi dan klik "Gabung Sesi" untuk masuk ke room' : 'Daftar sesi meeting aktif dan mendatang'}
              </p>
            </div>
            <button onClick={loadData} className="btn-secondary text-sm">
              Refresh Data
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 col-span-full">Belum ada sesi yang tersedia.</p>
            ) : (
              sessions.map((s) => {
                const isMySpeakerSession = isSpeaker && s.speaker_id === user?.id;
                const canOpenSpeaker = isAdmin || isMySpeakerSession;

                return (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onAction={canOpenSpeaker ? handleOpenSpeakerRoom : handleJoinClientRoom}
                    actionLabel={canOpenSpeaker ? 'Buka Room Speaker' : 'Gabung Sesi'}
                    actionColor={canOpenSpeaker ? 'btn-primary' : 'btn-success'}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateSession} className="card w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-semibold text-lg">Buat Sesi Baru</h3>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Schedule ID</label>
              <input
                type="number"
                className="input-field"
                value={sessionForm.schedule_id}
                onChange={(e) => setSessionForm({ ...sessionForm, schedule_id: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Speaker User ID</label>
              <input
                type="number"
                className="input-field"
                placeholder="ID user yang bertindak sebagai speaker"
                value={sessionForm.speaker_id}
                onChange={(e) => setSessionForm({ ...sessionForm, speaker_id: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary">Buat Sesi</button>
              <button type="button" onClick={() => setShowSessionForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Register User Modal (Admin only) */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleRegisterUser} className="card w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-semibold text-lg">Tambah User Baru</h3>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="nama@meeting.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nama Tampilan</label>
              <input
                className="input-field"
                placeholder="Nama Lengkap"
                value={userForm.display_name}
                onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="Minimal 6 karakter"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Peran Akun</label>
              <select
                className="input-field"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="speaker">Speaker</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary">Daftarkan</button>
              <button type="button" onClick={() => setShowUserForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

