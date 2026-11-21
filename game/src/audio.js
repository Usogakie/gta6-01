// Synthesised sound: every effect is built with the Web Audio API.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    sirenNodes: null,
    engineNodes: null,

    ensure() {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return false;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.35;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return true;
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) {
        this.master.gain.value = this.muted ? 0 : 0.35;
      }
      return this.muted;
    },

    tone(freqStart, freqEnd, duration, type, volume) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, freqEnd),
        now + duration,
      );
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },

    noise(duration, volume, cutoff) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(now);
    },

    shoot() {
      this.noise(0.12, 0.5, 1800);
    },

    punch() {
      this.noise(0.08, 0.25, 900);
    },

    pickup() {
      this.tone(520, 880, 0.18, "sine", 0.3);
    },

    horn() {
      this.tone(370, 370, 0.25, "square", 0.18);
    },

    crash() {
      this.noise(0.35, 0.5, 700);
    },

    sting() {
      if (!this.ctx || this.muted) return;
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        setTimeout(() => this.tone(freq, freq, 0.22, "triangle", 0.3), i * 110);
      });
    },

    fail() {
      if (!this.ctx || this.muted) return;
      setTimeout(() => this.tone(330, 330, 0.3, "sawtooth", 0.22), 0);
      setTimeout(() => this.tone(220, 180, 0.45, "sawtooth", 0.22), 180);
    },

    startSiren() {
      if (!this.ctx || this.muted || this.sirenNodes) return;
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 700;
      const wobble = this.ctx.createOscillator();
      wobble.type = "sine";
      wobble.frequency.value = 0.6;
      const wobbleGain = this.ctx.createGain();
      wobbleGain.gain.value = 220;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      wobble.connect(wobbleGain);
      wobbleGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      wobble.start();
      this.sirenNodes = { osc, wobble, gain };
    },

    stopSiren() {
      if (!this.sirenNodes) return;
      try {
        this.sirenNodes.osc.stop();
        this.sirenNodes.wobble.stop();
      } catch (e) {
        // Already stopped.
      }
      this.sirenNodes = null;
    },

    engine(ratio) {
      if (!this.ctx || this.muted) {
        this.stopEngine();
        return;
      }
      if (!this.engineNodes) {
        const osc = this.ctx.createOscillator();
        osc.type = "sawtooth";
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.02;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.engineNodes = { osc, gain };
      }
      const now = this.ctx.currentTime;
      this.engineNodes.osc.frequency.setValueAtTime(
        55 + ratio * 160,
        now,
      );
      this.engineNodes.gain.gain.setValueAtTime(0.02 + ratio * 0.05, now);
    },

    stopEngine() {
      if (!this.engineNodes) return;
      try {
        this.engineNodes.osc.stop();
      } catch (e) {
        // Already stopped.
      }
      this.engineNodes = null;
    },
  };
  return audio;
}
