const STORAGE_KEY = "sweet-home-audio-v1";

export function createAudioEngine() {
  let context = null;
  let master = null;
  let ambienceNodes = [];
  let ambienceName = "";
  let volume = 0.62;
  let muted = false;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(1, saved.volume));
    if (saved && typeof saved.muted === "boolean") muted = saved.muted;
  } catch {}

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, muted })); } catch {}
  }
  function unlock() {
    if (typeof window === "undefined") return false;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    try {
      if (!context) {
        context = new AudioCtor();
        master = context.createGain();
        master.gain.value = muted ? 0 : volume;
        master.connect(context.destination);
      }
      if (context.state === "suspended") context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }
  function envelope(gain, start, duration, peak) {
    gain.gain.cancelScheduledValues(start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  }
  function tone(freq, duration, type = "sine", peak = 0.12, endFreq = freq, delay = 0) {
    if (!unlock()) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, freq), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    envelope(gain, start, duration, peak);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }
  function noise(duration = 0.12, peak = 0.07, cutoff = 900, delay = 0) {
    if (!unlock()) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    envelope(gain, start, duration, peak);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
  function stopAmbience() {
    for (const node of ambienceNodes) {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    }
    ambienceNodes = [];
    ambienceName = "";
  }
  function scene(name) {
    if (!unlock()) return;
    if (ambienceName === name) return;
    stopAmbience();
    ambienceName = name;
    if (name === "silent") return;
    const now = context.currentTime;
    const base = name === "cinematic" ? 41 : name === "game" ? 48 : 55;
    const level = name === "game" ? 0.022 : 0.014;
    for (let i = 0; i < 2; i++) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = base * (i === 0 ? 1 : 1.49);
      filter.type = "lowpass";
      filter.frequency.value = name === "cinematic" ? 190 : 260;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(level / (i + 1), now + 1.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start();
      ambienceNodes.push(osc, filter, gain);
    }
    if (name === "cinematic" || name === "game") {
      const length = context.sampleRate * 2;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) channel[i] = (Math.random() * 2 - 1) * 0.2;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = name === "cinematic" ? 420 : 230;
      gain.gain.value = name === "cinematic" ? 0.025 : 0.012;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      ambienceNodes.push(source, filter, gain);
    }
  }
  function sfx(name) {
    if (!unlock()) return;
    switch (name) {
      case "menu":
        tone(460, 0.08, "sine", 0.045, 620);
        break;
      case "confirm":
        tone(330, 0.11, "triangle", 0.07, 495);
        tone(495, 0.14, "sine", 0.05, 740, 0.075);
        break;
      case "radio":
        noise(0.22, 0.06, 1500);
        tone(180, 0.28, "sawtooth", 0.035, 80, 0.06);
        break;
      case "stinger":
        tone(110, 0.8, "sine", 0.08, 55);
        tone(165, 0.55, "triangle", 0.035, 82, 0.08);
        break;
      case "gunfire":
        noise(0.12, 0.18, 1800);
        tone(92, 0.19, "sawtooth", 0.16, 35, 0.015);
        noise(0.18, 0.045, 520, 0.11);
        break;
      case "footstep":
        noise(0.055, 0.028, 270);
        tone(72, 0.06, "sine", 0.018, 48);
        break;
      case "heavy-step":
        noise(0.085, 0.075, 430);
        tone(66, 0.10, "sine", 0.06, 39);
        break;
      case "soft-step":
        noise(0.045, 0.014, 190);
        tone(98, 0.06, "sine", 0.012, 71);
        break;
      case "light-click":
        noise(0.035, 0.025, 2300);
        tone(670, 0.045, "square", 0.012, 420, 0.025);
        break;
      case "breath":
        noise(0.65, 0.045, 600);
        tone(92, 0.55, "sine", 0.018, 62);
        break;
      case "heartbeat":
        tone(58, 0.10, "sine", 0.065, 42);
        tone(49, 0.13, "sine", 0.052, 36, 0.18);
        break;
      case "swing":
        noise(0.16, 0.07, 1900);
        tone(250, 0.14, "triangle", 0.035, 90);
        break;
      case "hit":
        noise(0.11, 0.13, 800);
        tone(78, 0.17, "sine", 0.11, 42);
        break;
      case "enemy-down":
        tone(120, 0.22, "sawtooth", 0.07, 45);
        noise(0.17, 0.06, 540, 0.05);
        break;
      case "pickup":
        tone(520, 0.10, "sine", 0.055, 700);
        tone(780, 0.14, "sine", 0.045, 960, 0.08);
        break;
      case "heal":
        tone(390, 0.18, "triangle", 0.05, 520);
        tone(520, 0.22, "sine", 0.045, 680, 0.12);
        break;
      case "hurt":
        tone(95, 0.22, "sawtooth", 0.08, 42);
        noise(0.13, 0.06, 460);
        break;
      case "death":
        tone(190, 0.7, "sine", 0.08, 38);
        break;
      case "monster":
        tone(58 + Math.random() * 17, 0.72, "sawtooth", 0.045, 28);
        tone(83, 0.54, "triangle", 0.025, 41, 0.06);
        noise(0.42, 0.025, 330, 0.05);
        break;
      case "victory":
        tone(220, 0.3, "sine", 0.05, 330);
        tone(330, 0.38, "sine", 0.06, 440, 0.14);
        tone(440, 0.55, "triangle", 0.045, 660, 0.3);
        break;
      default:
        break;
    }
  }
  function setVolume(value) {
    volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.035);
    save();
  }
  function setMuted(value) {
    muted = Boolean(value);
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.035);
    save();
  }
  function toggleMute() { setMuted(!muted); return muted; }
  return {
    unlock, scene, sfx, setVolume, setMuted, toggleMute,
    getVolume: () => volume,
    isMuted: () => muted
  };
}
