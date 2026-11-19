/**
 * Speech-to-Text & Audio Capture Module
 * Supports Khmer (km-KH), English, Dual capture, Audio Waveform Visualizer, and MediaRecorder
 */

class SpeechEngine {
  constructor(options = {}) {
    this.lang = options.lang || 'km-KH';
    this.recognition = null;
    this.isRecording = false;
    this.isPaused = false;
    this.startTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;

    // Callbacks
    this.onInterim = options.onInterim || (() => {});
    this.onResult = options.onResult || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onTimerTick = options.onTimerTick || (() => {});
    this.onMicError = options.onMicError || (() => {});

    // Audio recording & visualizer
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.audioContext = null;
    this.analyser = null;
    this.visualizerCanvas = options.visualizerCanvas || null;
    this.animationId = null;

    this.currentSpeaker = 'វាគ្មិន ១';

    this.initSpeechRecognition();
  }

  setSpeaker(speakerName) {
    this.currentSpeaker = speakerName;
  }

  setLanguage(langCode) {
    this.lang = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser. Please use Google Chrome.');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.onStatusChange('recording');
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'no-speech') return;
      if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        this.onMicError(event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isRecording && !this.isPaused) {
        try {
          this.recognition.start();
        } catch (e) {}
      } else if (!this.isRecording) {
        this.onStatusChange('idle');
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        this.onInterim(interimTranscript);
      }

      if (finalTranscript.trim()) {
        const timestamp = this.formatTime(this.elapsedSeconds);
        this.onResult({
          speaker: this.currentSpeaker,
          text: finalTranscript.trim(),
          timestamp: timestamp,
          seconds: this.elapsedSeconds
        });
      }
    };

    return true;
  }

  async start() {
    if (!this.recognition && !this.initSpeechRecognition()) {
      alert('កម្មវិធីរុករក (Browser) របស់អ្នកមិនគាំទ្រ Speech Recognition ទេ។ សូមប្រើប្រាស់ Google Chrome!');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start MediaRecorder
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioUrl = URL.createObjectURL(this.audioBlob);
      };
      this.mediaRecorder.start(1000);

      // Start Visualizer
      this.setupVisualizer(stream);

      // Start Speech Recognition
      this.recognition.lang = this.lang;
      this.recognition.start();

      this.isRecording = true;
      this.isPaused = false;
      this.startTime = Date.now() - (this.elapsedSeconds * 1000);
      this.startTimer();

      return true;
    } catch (err) {
      console.warn('Microphone inaccessible:', err);
      this.onMicError(err);
      return false;
    }
  }

  pause() {
    if (!this.isRecording) return;
    this.isPaused = true;
    this.isRecording = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
    this.stopTimer();
    this.onStatusChange('paused');
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isRecording = true;
    if (this.recognition) {
      try { this.recognition.start(); } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
    this.startTime = Date.now() - (this.elapsedSeconds * 1000);
    this.startTimer();
    this.onStatusChange('recording');
  }

  stop() {
    this.isRecording = false;
    this.isPaused = false;

    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    }

    this.stopVisualizer();
    this.stopTimer();
    this.onStatusChange('idle');
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      this.onTimerTick(this.formatTime(this.elapsedSeconds), this.elapsedSeconds);
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  resetTimer() {
    this.stopTimer();
    this.elapsedSeconds = 0;
    this.onTimerTick(this.formatTime(0), 0);
  }

  formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  setupVisualizer(stream) {
    if (!this.visualizerCanvas) return;
    const canvas = this.visualizerCanvas;
    const ctx = canvas.getContext('2d');

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        this.animationId = requestAnimationFrame(draw);
        this.analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#0284c7');
          gradient.addColorStop(1, '#38bdf8');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn('Visualizer setup error:', e);
    }
  }

  stopVisualizer() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
    }
    if (this.visualizerCanvas) {
      const ctx = this.visualizerCanvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
    }
  }
}

window.SpeechEngine = SpeechEngine;
