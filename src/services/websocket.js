const WS_BASE =
  window.location.protocol === 'https:'
    ? `wss://${window.location.host}`
    : `ws://${window.location.host}`;

export class WebSocketManager {
  constructor(sessionCode, token, onMessage) {
    this.sessionCode = sessionCode;
    this.token = token;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this._closed = false;
  }

  connect() {
    const url = `${WS_BASE}/ws/${this.sessionCode}?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected to room:', this.sessionCode);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      if (!this._closed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(
          `[WS] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
        );
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  startSession() {
    this.send({ type: 'start_session' });
  }

  endSession() {
    this.send({ type: 'end_session' });
  }

  toggleQA(qaOpen) {
    this.send({ type: 'toggle_qa', qa_open: qaOpen });
  }

  raiseHand() {
    this.send({ type: 'raise_hand' });
  }

  lowerHand() {
    this.send({ type: 'lower_hand' });
  }

  grantSpeak(participantId) {
    this.send({ type: 'grant_speak', participant_id: participantId });
  }

  revokeSpeak(participantId) {
    this.send({ type: 'revoke_speak', participant_id: participantId });
  }

  sendOffer(data, targetId = null) {
    this.send({ type: 'offer', data, target_id: targetId });
  }

  sendAnswer(data, targetId) {
    this.send({ type: 'answer', data, target_id: targetId });
  }

  sendIceCandidate(data, targetId = null) {
    this.send({ type: 'ice_candidate', data, target_id: targetId });
  }

  disconnect() {
    this._closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
