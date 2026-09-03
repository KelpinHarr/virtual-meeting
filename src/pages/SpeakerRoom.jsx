import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getToken, updateSessionStatus, formatErrorMessage } from '../services/api';
import { WebSocketManager } from '../services/websocket';
import { AudioBroadcaster } from '../services/webrtc';
import AudioVisualizer from '../components/AudioVisualizer';
import ErrorModal from '../components/ErrorModal';

export default function SpeakerRoom() {
  const { sessionCode } = useParams();
  const token = getToken();

  const [isLive, setIsLive] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]);
  const [sessionEnded, setSessionEnded] = useState(false);

  const [micActive, setMicActive] = useState(false);
  const [systemAudioActive, setSystemAudioActive] = useState(false);
  const [micStream, setMicStream] = useState(null);

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const showError = (title, err, fallback) => {
    const msg = formatErrorMessage(err, fallback);
    setErrorModal({
      isOpen: true,
      title,
      message: msg,
    });
  };

  const wsRef = useRef(null);
  const broadcasterRef = useRef(new AudioBroadcaster());
  const myIdRef = useRef(null);
  const handleMessageRef = useRef(null);

  const sendOfferToParticipant = useCallback((participantId) => {
    const broadcaster = broadcasterRef.current;
    broadcaster
      .createOfferForListener(participantId, (targetId, candidate) => {
        wsRef.current?.sendIceCandidate(candidate, targetId);
      })
      .then((offer) => {
        wsRef.current?.sendOffer(offer, participantId);
      })
      .catch((err) => {
        console.warn('[Speaker] Create offer failed for:', participantId, err);
      });
  }, []);

  const broadcastOfferToAll = useCallback(() => {
    participants
      .filter((p) => p.participant_id !== myIdRef.current)
      .forEach((p) => {
        sendOfferToParticipant(p.participant_id);
      });
  }, [participants, sendOfferToParticipant]);

  const handleMessage = useCallback(
    (msg) => {
      switch (msg.type) {
        case 'room_state': {
          setIsLive(msg.is_live || false);
          setQaOpen(msg.qa_open || false);
          if (msg.your_id) myIdRef.current = msg.your_id;

          // Deduplicate incoming participants
          const seen = new Set();
          const uniqueList = [];
          for (const p of msg.participants || []) {
            const key = p.user_id ? `u_${p.user_id}` : p.participant_id;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueList.push(p);
            }
          }
          setParticipants(uniqueList);
          setRaisedHands(msg.raised_hands || []);
          break;
        }
        case 'participant_joined':
          setParticipants((prev) => {
            // Check if already present by participant_id or user_id
            const exists = prev.some(
              (p) =>
                p.participant_id === msg.participant_id ||
                (msg.user_id && p.user_id && p.user_id === msg.user_id)
            );
            if (exists) {
              return prev.map((p) =>
                p.participant_id === msg.participant_id ||
                (msg.user_id && p.user_id && p.user_id === msg.user_id)
                  ? {
                      ...p,
                      participant_id: msg.participant_id,
                      display_name: msg.display_name,
                      role: msg.role,
                      user_id: msg.user_id,
                    }
                  : p
              );
            }
            return [
              ...prev,
              {
                participant_id: msg.participant_id,
                display_name: msg.display_name,
                role: msg.role,
                user_id: msg.user_id,
              },
            ];
          });
          // Send WebRTC offer to the newly joined participant
          sendOfferToParticipant(msg.participant_id);
          break;
        case 'participant_left':
          setParticipants((prev) =>
            prev.filter((p) => p.participant_id !== msg.participant_id)
          );
          setRaisedHands((prev) =>
            prev.filter((h) => h.participant_id !== msg.participant_id)
          );
          broadcasterRef.current.removePeer(msg.participant_id);
          break;
        case 'qa_toggled':
          setQaOpen(msg.qa_open);
          if (!msg.qa_open) setRaisedHands([]);
          break;
        case 'hand_raised':
          setRaisedHands((prev) => {
            if (prev.find((h) => h.participant_id === msg.participant_id)) return prev;
            return [
              ...prev,
              { participant_id: msg.participant_id, display_name: msg.display_name },
            ];
          });
          break;
        case 'hand_lowered':
        case 'speak_granted':
          setRaisedHands((prev) =>
            prev.filter((h) => h.participant_id !== msg.participant_id)
          );
          break;
        case 'speak_revoked':
          break;
        case 'session_ended':
          setSessionEnded(true);
          setIsLive(false);
          break;
        case 'answer': {
          const broadcaster = broadcasterRef.current;
          if (msg.data) broadcaster.handleAnswer(msg.sender_id, msg.data);
          break;
        }
        case 'ice_candidate': {
          const broadcaster = broadcasterRef.current;
          if (msg.data) broadcaster.addIceCandidate(msg.sender_id, msg.data);
          break;
        }
        default:
          break;
      }
    },
    [sendOfferToParticipant]
  );

  handleMessageRef.current = handleMessage;

  useEffect(() => {
    if (!token || !sessionCode) return;
    const ws = new WebSocketManager(sessionCode, token, (msg) => {
      handleMessageRef.current?.(msg);
    });
    wsRef.current = ws;
    ws.connect();

    return () => {
      ws.disconnect();
      broadcasterRef.current.stop();
    };
  }, [sessionCode, token]);

  const toggleMic = async () => {
    const broadcaster = broadcasterRef.current;
    if (micActive) {
      broadcaster.stopMicrophone();
      setMicActive(false);
      setMicStream(null);
    } else {
      try {
        const stream = await broadcaster.startMicrophone();
        setMicActive(true);
        setMicStream(stream);
        broadcastOfferToAll();
      } catch (err) {
        showError(
          'Gagal Menyalakan Mikrofon',
          err,
          'Pastikan browser memiliki izin mengakses mikrofon di pengaturan browser Anda.'
        );
      }
    }
  };

  const toggleSystemAudio = async () => {
    const broadcaster = broadcasterRef.current;
    if (systemAudioActive) {
      broadcaster.stopSystemAudio();
      setSystemAudioActive(false);
    } else {
      try {
        await broadcaster.startSystemAudio();
        setSystemAudioActive(true);
        broadcastOfferToAll();
      } catch (err) {
        if (!err.message?.includes('dibatalkan')) {
          showError(
            'Gagal Berbagi Audio',
            err,
            'Pastikan Anda mencentang opsi "Bagikan Audio" saat memilih jendela / tab browser.'
          );
        }
      }
    }
  };

  const handleStartSession = async () => {
    wsRef.current?.startSession();
    setIsLive(true);
    broadcastOfferToAll();
    try {
      await updateSessionStatus(0, 'live');
    } catch {}
  };

  const handleEndSession = async () => {
    if (!confirm('Akhiri sesi ini?')) return;
    broadcasterRef.current.stop();
    wsRef.current?.endSession();
    setSessionEnded(true);
    setIsLive(false);
  };

  const handleToggleQA = () => {
    const newState = !qaOpen;
    wsRef.current?.toggleQA(newState);
    setQaOpen(newState);
  };

  const handleGrantSpeak = (participantId) => {
    wsRef.current?.grantSpeak(participantId);
  };

  const handleRevokeSpeak = (participantId) => {
    wsRef.current?.revokeSpeak(participantId);
  };

  // Filter out the current speaker and deduplicate to get actual attendee list
  const seenAudience = new Set();
  const audienceList = [];
  for (const p of participants) {
    if (p.participant_id === myIdRef.current) continue;
    const key = p.user_id ? `u_${p.user_id}` : (p.participant_id || p.display_name);
    if (!seenAudience.has(key)) {
      seenAudience.add(key);
      audienceList.push(p);
    }
  }
  const audienceCount = audienceList.length;

  if (sessionEnded) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="card text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Sesi Berakhir</h2>
          <p className="text-gray-500">Sesi meeting {sessionCode} telah selesai.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
      />

      <div className="card mb-6 border border-navy-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Speaker Room
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-navy-900">
              Kode Sesi: <code className="text-primary-600 tracking-wide">{sessionCode}</code>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${isLive ? 'bg-teal-500 animate-pulse shadow-sm shadow-teal-300' : 'bg-navy-300'}`} />
            <span className="text-sm font-bold text-navy-900">{isLive ? '🔴 LIVE' : 'Belum Dimulai'}</span>
            <span className="text-xs font-semibold bg-navy-100 text-navy-700 px-2.5 py-1 rounded-full">
              {audienceCount} peserta
            </span>
          </div>
        </div>
      </div>

      <div className="card mb-6 border border-navy-100 shadow-sm">
        <h2 className="font-bold text-navy-900 mb-4 text-base">Kontrol Audio</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={toggleMic} className={micActive ? 'btn-danger' : 'btn-primary'}>
            {micActive ? '🎤 Matikan Mic' : '🎤 Nyalakan Mic'}
          </button>
          <button onClick={toggleSystemAudio} className={systemAudioActive ? 'btn-danger' : 'btn-secondary'}>
            {systemAudioActive ? '🔊 Stop Share Audio' : '🔊 Share System Audio'}
          </button>
        </div>
        {micStream && (
          <div className="mt-4 p-4 bg-navy-50 rounded-2xl border border-navy-100">
            <AudioVisualizer stream={micStream} label="Microphone Aktif" />
          </div>
        )}
      </div>

      <div className="card mb-6 border border-navy-100 shadow-sm">
        <h2 className="font-bold text-navy-900 mb-4 text-base">Kontrol Sesi</h2>
        <div className="flex flex-wrap gap-3">
          {!isLive ? (
            <button onClick={handleStartSession} className="btn-success">
              ▶️ Mulai Sesi
            </button>
          ) : (
            <button onClick={handleEndSession} className="btn-danger">
              ⏹ Akhiri Sesi
            </button>
          )}
          <button
            onClick={handleToggleQA}
            className={qaOpen ? 'btn-danger' : 'btn-purple'}
            disabled={!isLive}
          >
            {qaOpen ? '🚫 Tutup Q&A' : '✋ Buka Q&A'}
          </button>
        </div>
      </div>

      {qaOpen && (
        <div className="card mb-6 border border-purple-200 bg-purple-50/40 shadow-sm">
          <h2 className="font-bold text-purple-900 mb-4 text-base">
            ✋ Antrian Raise Hand ({raisedHands.length})
          </h2>
          {raisedHands.length === 0 ? (
            <p className="text-navy-400 text-sm">Belum ada peserta yang mengangkat tangan.</p>
          ) : (
            <div className="space-y-2.5">
              {raisedHands.map((h) => (
                <div key={h.participant_id} className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm">
                  <span className="font-bold text-navy-900">✋ {h.display_name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGrantSpeak(h.participant_id)}
                      className="btn-success text-xs py-1.5 px-3"
                    >
                      Izinkan Bicara
                    </button>
                    <button
                      onClick={() => handleRevokeSpeak(h.participant_id)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card border border-navy-100 shadow-sm">
        <h2 className="font-bold text-navy-900 mb-4 text-base">Peserta ({audienceCount})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {audienceCount === 0 ? (
            <p className="text-navy-400 text-sm text-center py-6">
              Belum ada peserta yang bergabung ke sesi ini.
            </p>
          ) : (
            audienceList.map((p) => (
              <div key={p.participant_id} className="flex items-center justify-between py-2.5 px-3.5 bg-navy-50 rounded-xl border border-navy-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${p.is_speaking ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-navy-300'}`} />
                  <span className="text-sm font-semibold text-navy-900">{p.display_name}</span>
                  {p.role === 'speaker' && (
                    <span className="text-xs bg-primary-100 text-primary-800 border border-primary-200 px-2 py-0.5 rounded-full font-bold">
                      Speaker
                    </span>
                  )}
                  {p.role === 'admin' && (
                    <span className="text-xs bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                      Admin
                    </span>
                  )}
                </div>
                {p.hand_raised && <span className="text-sm">✋</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

