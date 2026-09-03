const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: STUN_SERVERS });
}

export async function captureMicrophone() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      'Browser tidak mendukung akses mikrofon atau halaman tidak dibuka melalui HTTPS / localhost.'
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err) {
    console.warn('[WebRTC] High-quality audio constraints failed, trying basic audio...', err);
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (fallbackErr) {
      if (
        fallbackErr.name === 'NotAllowedError' ||
        fallbackErr.name === 'PermissionDeniedError'
      ) {
        throw new Error(
          'Izin mikrofon ditolak. Klik ikon gembok / perizinan di baris URL browser Anda lalu izinkan Mikrofon.'
        );
      }
      if (
        fallbackErr.name === 'NotFoundError' ||
        fallbackErr.name === 'DevicesNotFoundError'
      ) {
        throw new Error('Tidak ada mikrofon yang terdeteksi di perangkat Anda.');
      }
      throw new Error(
        fallbackErr.message || 'Gagal mengakses mikrofon pada perangkat Anda.'
      );
    }
  }
}

export async function captureSystemAudio() {
  if (!navigator?.mediaDevices?.getDisplayMedia) {
    throw new Error('Browser tidak mendukung penangkapan system audio.');
  }

  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Izin share audio dibatalkan.');
    }
    throw new Error(err.message || 'Gagal membagikan audio sistem.');
  }
}

export function mixAudioStreams(streams) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const destination = ctx.createMediaStreamDestination();

  streams.forEach((stream) => {
    const source = ctx.createMediaStreamSource(stream);
    source.connect(destination);
  });

  return {
    mixed: destination.stream,
    context: ctx,
  };
}

export class AudioBroadcaster {
  constructor() {
    this.micStream = null;
    this.systemStream = null;
    this.mixedStream = null;
    this.audioContext = null;
    this.peerConnections = new Map();
  }

  async startMicrophone() {
    this.micStream = await captureMicrophone();
    this._updateMix();
    return this.micStream;
  }

  async startSystemAudio() {
    this.systemStream = await captureSystemAudio();
    this.systemStream.getVideoTracks().forEach((t) => {
      t.onended = () => this.stopSystemAudio();
      t.stop();
    });
    this._updateMix();
    return this.systemStream;
  }

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
      this._updateMix();
    }
  }

  stopSystemAudio() {
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
      this._updateMix();
    }
  }

  _updateMix() {
    const streams = [];
    if (this.micStream) streams.push(this.micStream);
    if (this.systemStream) streams.push(this.systemStream);

    if (streams.length === 0) {
      this.mixedStream = null;
      return;
    }

    if (streams.length === 1) {
      this.mixedStream = streams[0];
      this._replaceTracksInPeers();
      return;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
    }
    const { mixed, context } = mixAudioStreams(streams);
    this.mixedStream = mixed;
    this.audioContext = context;
    this._replaceTracksInPeers();
  }

  _replaceTracksInPeers() {
    if (!this.mixedStream) return;
    const audioTrack = this.mixedStream.getAudioTracks()[0];
    if (!audioTrack) return;

    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      const audioSender = senders.find(
        (s) => s.track?.kind === 'audio' || s.kind === 'audio'
      );
      if (audioSender) {
        audioSender.replaceTrack(audioTrack);
      } else {
        try {
          pc.addTrack(audioTrack, this.mixedStream);
        } catch (e) {
          console.warn('[Broadcaster] Add track to pc failed:', e);
        }
      }
    });
  }

  async createOfferForListener(participantId, onIceCandidate) {
    const pc = createPeerConnection();
    this.peerConnections.set(participantId, pc);

    if (this.mixedStream) {
      this.mixedStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.mixedStream);
      });
    } else {
      // Add a transreceiver so offer has audio m-line
      pc.addTransceiver('audio', { direction: 'sendonly' });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(participantId, event.candidate);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleAnswer(participantId, answer) {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async addIceCandidate(participantId, candidate) {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  removePeer(participantId) {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }
  }

  stop() {
    this.stopMicrophone();
    this.stopSystemAudio();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class AudioListener {
  constructor() {
    this.pc = null;
    this.remoteStream = null;
    this.audioElement = null;
    this.micStream = null;
  }

  async handleOffer(offer, onIceCandidate) {
    this.pc = createPeerConnection();

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.audioElement) {
        this.audioElement.srcObject = this.remoteStream;
        this.audioElement.play().catch(() => {});
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate) {
    if (this.pc) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  async enableMicrophone() {
    this.micStream = await captureMicrophone();
    if (this.pc) {
      this.micStream.getAudioTracks().forEach((track) => {
        this.pc.addTrack(track, this.micStream);
      });
    }
    return this.micStream;
  }

  disableMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
  }

  setAudioElement(el) {
    this.audioElement = el;
    if (this.remoteStream && el) {
      el.srcObject = this.remoteStream;
      el.play().catch(() => {});
    }
  }

  stop() {
    this.disableMicrophone();
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
  }
}
