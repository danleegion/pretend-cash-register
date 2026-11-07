/**
 * Web Audio API Sound Engine for Kids Cash Register
 * Zero external dependencies, 100% offline & instant playback.
 * Voice/speech synthesis removed — pure sound effects only.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.sfxEnabled = true;
    this.musicGain = null;
    this.sfxGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.8;
        this.sfxGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.18; // gentle background volume
        this.musicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Haptic Feedback Helper ---
  vibrate(pattern = 30) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // --- Sound Effects ---

  // Standard tactile button blip
  playKeypadClick(frequency = 520) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate(15);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 0.04);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Supermarket Barcode Scanner Beep
  playScannerBeep() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate([40, 20, 40]);

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2450, now); // Classic high supermarket scanner pitch

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1225, now);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.setValueAtTime(0.6, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.1);
    osc2.stop(now + 0.1);
  }

  // Realistic Card Reader Contactless Beep Sequence (RFID Tap)
  // Real POS machines make 4 rapid high chirps or one distinct contactless double-beep
  async playCardTapSequence(onLedUpdate = null) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    this.vibrate([50, 40, 50, 40, 80]);

    // 4 LED progressive contactless chimes: pip-pip-pip-BEEP!
    const pitches = [1480, 1480, 1480, 1960];
    const delays = [0, 90, 180, 270];

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (onLedUpdate) onLedUpdate(i + 1);
        this.playSingleCardBeep(pitches[i], i === 3 ? 0.14 : 0.06);
      }, delays[i]);
    }
  }

  playSingleCardBeep(freq, dur) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Card Approved / Payment Success Fanfare (Happy Ding-Dong-Ding!)
  playApprovedChime() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate([60, 50, 100]);

    const chords = [
      { freq: 523.25, time: 0 },    // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.50, time: 0.38 } // C6
    ];

    chords.forEach(note => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.45);
      }, note.time * 1000);
    });
  }

  // Cash Register KA-CHING! — proper layered mechanical bell sound
  playKaChing() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate([80, 30, 120]);

    const now = this.ctx.currentTime;

    // ── Layer 1: Sharp mechanical THUNK (drawer latch snap) ──────────────
    // Filtered noise burst for the mechanical click
    const bufferSize = this.ctx.sampleRate * 0.06;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 320;
    noiseFilter.Q.value = 0.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.06);

    // ── Layer 2: "KA" transient impact tone (low body thud) ──────────────
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(220, now);
    thud.frequency.exponentialRampToValueAtTime(60, now + 0.07);
    thudGain.gain.setValueAtTime(0.8, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.08);

    // ── Layer 3: Classic cash register CHING bell ─────────────────────────
    // Real cash register bells are around 1500–2000 Hz with many harmonics
    // that ring for ~1.5 seconds with slow exponential decay
    const bellFreqs = [
      { f: 1760, vol: 0.65, decay: 1.6 },   // main fundamental (A6)
      { f: 2960, vol: 0.40, decay: 1.2 },   // bright 2nd partial
      { f: 4320, vol: 0.22, decay: 0.9 },   // shimmer 3rd partial
      { f: 5500, vol: 0.10, decay: 0.5 },   // sparkle overtone
    ];

    setTimeout(() => {
      if (!this.ctx) return;
      bellFreqs.forEach(({ f, vol, decay }) => {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        // Very slight pitch drop simulates real struck metal
        osc.frequency.exponentialRampToValueAtTime(f * 0.994, t + decay);

        // Sharp attack + long resonant tail — the key to a real bell
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.004); // 4ms attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      });
    }, 55); // Bell hits just after the thunk

    // ── Layer 4: Coin jingle (drawer contents rattle) ─────────────────────
    setTimeout(() => {
      this.playCoinJingle();
    }, 160);
  }

  // Realistic Coin Drop & Clatter
  playCoinDrop() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate(25);

    const freqs = [3200, 3800, 4200];
    freqs.forEach((f, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f + (Math.random() * 200 - 100), now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
      }, idx * 40);
    });
  }

  playCoinJingle() {
    const tones = [2400, 3100, 2800, 3600, 4200];
    tones.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
      }, i * 35);
    });
  }

  // Paper Receipt Printer Sound (Chirping stepper motor)
  playPrinterMotor() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400 + (i % 2 === 0 ? 80 : 0), now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.05);
      }, i * 65);
    }
  }

  // Trash / Clear Cart Whoosh Sound
  playClearSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    this.vibrate(30);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // --- Real-time Synthesized Cheerful Background Music Loop ---
  // Gentle, charming music box / toy marimba melody that never gets grating
  toggleMusic() {
    this.init();
    if (this.musicPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  startMusic() {
    if (this.musicPlaying) return;
    this.init();
    this.musicPlaying = true;
    this.musicStep = 0;

    // Upbeat pentatonic playful tune (C major pentatonic: C, D, E, G, A)
    const melody = [
      { note: 523.25, dur: 0.2 }, // C5
      { note: 659.25, dur: 0.2 }, // E5
      { note: 783.99, dur: 0.2 }, // G5
      { note: 880.00, dur: 0.35 },// A5
      { note: 783.99, dur: 0.2 }, // G5
      { note: 659.25, dur: 0.2 }, // E5
      { note: 587.33, dur: 0.35 },// D5
      { note: 523.25, dur: 0.4 }, // C5

      { note: 659.25, dur: 0.2 }, // E5
      { note: 783.99, dur: 0.2 }, // G5
      { note: 880.00, dur: 0.2 }, // A5
      { note: 1046.50, dur: 0.35 },// C6
      { note: 880.00, dur: 0.2 }, // A5
      { note: 783.99, dur: 0.2 }, // G5
      { note: 659.25, dur: 0.35 },// E5
      { note: 587.33, dur: 0.4 }  // D5
    ];

    const bass = [
      261.63, 261.63, 329.63, 329.63,
      392.00, 392.00, 329.63, 261.63
    ];

    const stepDuration = 260; // ms per step

    this.musicTimer = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;
      const step = this.musicStep % melody.length;
      const item = melody[step];

      // Play melody note (bell-like marimba)
      this.playSynthNote(item.note, item.dur, 'sine', 0.22);

      // Play gentle bass note on every other beat
      if (step % 2 === 0) {
        const bassFreq = bass[(step / 2) % bass.length];
        this.playSynthNote(bassFreq / 2, 0.35, 'triangle', 0.15);
      }

      this.musicStep++;
    }, stepDuration);
  }

  playSynthNote(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx || !this.musicPlaying) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Global instance
window.soundEngine = new SoundEngine();
