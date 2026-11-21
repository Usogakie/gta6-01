// Synthesised sound for Palmera Bay: no audio files, everything is built
// with the Web Audio API — engine hum, sirens, gunshots, pickups and stings.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    sirenNodes: null,
    engineNodes: null,
  };

  audio.ensure = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.35;
      audio.master.connect(audio.ctx.destination);
    } catch {
      audio.ctx = null;
    }
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.35;
    return audio.muted;
  };

  function blip(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!audio.ctx || audio.muted) return;
    const t = audio.ctx.currentTime;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = audio.ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t);
  }

  audio.shot = () => noiseBurst(0.12, 0.5, 900);
  audio.punch = () => noiseBurst(0.08, 0.3, 500);
  audio.pickup = () => { blip(660, 0.12, 'sine', 0.25, 990); };
  audio.horn = () => { blip(220, 0.25, 'square', 0.12, 220); };
  audio.crash = () => noiseBurst(0.25, 0.4, 400);
  audio.sting = () => {
    blip(523, 0.16, 'triangle', 0.25);
    setTimeout(() => blip(659, 0.16, 'triangle', 0.25), 140);
    setTimeout(() => blip(784, 0.3, 'triangle', 0.28), 280);
  };
  audio.fail = () => {
    blip(392, 0.2, 'sawtooth', 0.15, 311);
    setTimeout(() => blip(311, 0.35, 'sawtooth', 0.15, 233), 180);
  };

  // A looping two-tone police siren while the player is wanted.
  audio.setSiren = (on) => {
    if (!audio.ctx) return;
    if (on && !audio.sirenNodes) {
      const osc = audio.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 700;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.05;
      const lfo = audio.ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = audio.ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      lfo.start();
      audio.sirenNodes = { osc, lfo, gain };
    } else if (!on && audio.sirenNodes) {
      try { audio.sirenNodes.osc.stop(); audio.sirenNodes.lfo.stop(); } catch { /* already stopped */ }
      audio.sirenNodes = null;
    }
  };

  // Engine hum whose pitch follows the driven car's speed.
  audio.setEngine = (speedRatio) => {
    if (!audio.ctx) return;
    if (speedRatio <= 0.02) {
      if (audio.engineNodes) {
        try { audio.engineNodes.osc.stop(); } catch { /* already stopped */ }
        audio.engineNodes = null;
      }
      return;
    }
    if (!audio.engineNodes) {
      const osc = audio.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.04;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      osc.start();
      audio.engineNodes = { osc, gain };
    }
    audio.engineNodes.osc.frequency.value = 55 + speedRatio * 160;
    audio.engineNodes.gain.gain.value = 0.02 + speedRatio * 0.05;
  };

  return audio;
}
