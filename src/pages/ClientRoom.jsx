import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getToken } from '../services/api';
import { WebSocketManager } from '../services/websocket';
import { AudioListener } from '../services/webrtc';
import AudioVisualizer from '../components/AudioVisualizer';

export default function ClientRoom() {
  const { sessionCode } = useParams();
  const token = getToken();

  const [isLive, setIsLive] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [myId, setMyId] = useState(null);
  const [connected, setConnected] = useState(false);

  const [micStream, setMicStream] = useState(null);
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const listenerRef = useRef(new AudioListener());
  const myIdRef = useRef(null);
  const handleMessageRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_state':
        setIsLive(msg.is_live || false);
        setQaOpen(msg.qa_open || false);
        setParticipantCount(msg.participant_count || 0);
        if (msg.your_id) {
          myIdRef.current = msg.your_id;
          setMyId(msg.your_id);
        }
        setConnected(true);
        break;
      case 'session_started':
        setIsLive(true);
        break;
      case 'session_ended':
        setSessionEnded(true);
        setIsLive(false);
        break;
      case 'qa_toggled':
        setQaOpen(msg.qa_open);
        if (!msg.qa_open) {
          setHandRaised(false);
          setCanSpeak(false);
          listenerRef.current.disableMicrophone();
          setMicStream(null);
        }
        break;
      case 'participant_joined':
      case 'participant_left':
        setParticipantCount(msg.participant_count || 0);
        break;
      case 'speak_granted':
        if (msg.participant_id === myIdRef.current) {
          setCanSpeak(true);
          setHandRaised(false);
          listenerRef.current.enableMicrophone().then((stream) => {
            setMicStream(stream);
          });
        }
        break;
      case 'speak_revoked':
        if (msg.participant_id === myIdRef.current) {
          setCanSpeak(false);
          listenerRef.current.disableMicrophone();
          setMicStream(null);
        }
        break;
      case 'offer': {
        const listener = listenerRef.current;
        if (audioRef.current) {
          listener.setAudioElement(audioRef.current);
        }
        listener
          .handleOffer(msg.data, (candidate) => {
            wsRef.current?.sendIceCandidate(candidate, msg.sender_id);
          })
          .then((answer) => {
            wsRef.current?.sendAnswer(answer, msg.sender_id);
          })
          .catch((err) => console.warn('[Listener] handleOffer error:', err));
        break;
      }
      case 'ice_candidate': {
        const listener = listenerRef.current;
        if (msg.data) listener.addIceCandidate(msg.data);
        break;
      }
      default:
        break;
    }
  }, []);

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
      listenerRef.current.stop();
    };
  }, [sessionCode, token]);

  useEffect(() => {
    if (audioRef.current) {
      listenerRef.current.setAudioElement(audioRef.current);
    }
  }, []);

  const handleRaiseHand = () => {
    if (handRaised) {
      wsRef.current?.lowerHand();
      setHandRaised(false);
    } else {
      wsRef.current?.raiseHand();
      setHandRaised(true);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <h2 className="text-xl font-bold mb-2">Akses Diperlukan</h2>
          <p className="text-gray-500 mb-4">
            Silakan masuk terlebih dahulu untuk bergabung ke sesi ini.
          </p>
          <a href={`/join/${sessionCode}`} className="btn-primary inline-block">
            Gabung sebagai Tamu
          </a>
        </div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card text-center max-w-sm">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-xl font-bold mb-2">Sesi Berakhir</h2>
          <p className="text-gray-500">Terima kasih telah bergabung di sesi ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <audio ref={audioRef} autoPlay playsInline />

      <div className="card mb-4 text-center border border-navy-100 shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isLive
                ? 'bg-teal-500 animate-pulse shadow-sm shadow-teal-300'
                : connected
                ? 'bg-amber-500'
                : 'bg-navy-300'
            }`}
          />
          <span className="text-lg font-extrabold text-navy-900">
            {isLive ? '🔴 LIVE' : connected ? 'Menunggu Speaker...' : 'Menghubungkan...'}
          </span>
        </div>
        <p className="text-navy-500 text-sm">
          Sesi: <code className="font-extrabold text-primary-600 text-base">{sessionCode}</code>
        </p>
        <p className="text-navy-400 text-xs mt-1 font-medium">{participantCount} peserta online</p>
      </div>

      {isLive && (
        <div className="card mb-4 text-center border border-primary-100 bg-primary-50/40 shadow-sm">
          <div className="text-3xl mb-2">🎧</div>
          <p className="text-primary-900 font-bold">Mendengarkan siaran langsung...</p>
          <p className="text-navy-500 text-xs mt-1 font-medium">Audio streaming aktif. Pastikan volume perangkat Anda menyala.</p>
        </div>
      )}

      <div className="card mb-4 border border-navy-100 shadow-sm">
        {qaOpen ? (
          <div className="text-center">
            <p className="text-sm text-purple-700 font-bold mb-3 flex items-center justify-center gap-1.5">
              <span>✋</span> Sesi Tanya-Jawab Sedang Dibuka
            </p>
            {canSpeak ? (
              <div>
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-3">
                  <p className="text-teal-900 font-bold text-base">🎤 Anda diizinkan berbicara!</p>
                  <p className="text-teal-700 text-xs mt-1 font-medium">Mikrofon Anda aktif — silakan ajukan pertanyaan.</p>
                </div>
                {micStream && (
                  <AudioVisualizer stream={micStream} label="Mic Anda Aktif" color="bg-teal-500" />
                )}
              </div>
            ) : (
              <button
                onClick={handleRaiseHand}
                className={`w-full py-4 text-lg font-bold rounded-2xl transition-all shadow-sm ${
                  handRaised
                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 hover:bg-amber-200'
                    : 'btn-purple'
                }`}
              >
                {handRaised ? '✋ Tangan Terangkat — Menunggu...' : '✋ Angkat Tangan'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-navy-400 py-3">
            <p className="text-sm font-medium">Sesi tanya-jawab belum dibuka oleh speaker.</p>
          </div>
        )}
      </div>

      <div className="text-center">
        <span className={`text-xs font-semibold ${connected ? 'text-teal-600' : 'text-red-500'}`}>
          {connected ? '● Terhubung ke Room' : '○ Tidak terhubung'}
        </span>
      </div>
    </div>
  );
}
