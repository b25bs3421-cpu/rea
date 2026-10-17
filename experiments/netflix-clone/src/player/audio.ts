/**
 * A tiny procedural score for the synthetic player. It creates a slow,
 * cinematic drone (two detuned sines, a sub, filtered noise and a very slow
 * filter LFO) so playback is not silent. It is not dialogue or licensed music.
 */
export class AmbientScore {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private filter: BiquadFilterNode | null = null;
  private volume = 0.6;
  private muted = false;
  private started = false;

  async start(baseFrequency = 52) {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    try {
      const ctx = new AudioCtor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.master = master;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.6;
      filter.connect(master);
      this.filter = filter;

      const frequencies = [baseFrequency, baseFrequency * 1.5, baseFrequency * 2.01, baseFrequency * 0.5];
      const gains = [0.3, 0.12, 0.06, 0.18];
      frequencies.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        osc.type = index === 0 ? 'sine' : index === 3 ? 'triangle' : 'sine';
        osc.frequency.value = frequency;
        osc.detune.value = (index - 1.5) * 4;
        const gain = ctx.createGain();
        gain.gain.value = gains[index];
        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        this.nodes.push(osc);
      });

      // Slow breathing filter movement.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.045;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 190;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.nodes.push(lfo);

      const ambientGain = ctx.createGain();
      ambientGain.gain.value = 0.05;
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 360;
      noiseFilter.Q.value = 0.7;
      noise.connect(noiseFilter);
      noiseFilter.connect(ambientGain);
      ambientGain.connect(master);
      noise.start();
      this.nodes.push(noise);

      // A soft, original two-note signature swell.
      const now = ctx.currentTime;
      [baseFrequency * 4, baseFrequency * 4.75].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + index * 0.55);
        gain.gain.linearRampToValueAtTime(0.035, now + index * 0.55 + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.55 + 3.6);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + index * 0.55);
        osc.stop(now + index * 0.55 + 3.8);
        this.nodes.push(osc);
      });

      this.started = true;
      this.applyVolume();
      await ctx.resume().catch(() => undefined);
    } catch {
      // Audio is optional. Playback continues silently if the browser blocks it.
    }
  }

  private applyVolume() {
    if (!this.ctx || !this.master) return;
    const target = this.muted ? 0 : Math.max(0, Math.min(1, this.volume)) * 0.115;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyVolume();
  }

  suspend() {
    void this.ctx?.suspend().catch(() => undefined);
  }

  resume() {
    if (!this.started) return;
    void this.ctx?.resume().catch(() => undefined);
  }

  dispose() {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.nodes = [];
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.started = false;
  }
}

export function playBrandChime(enabled = true) {
  if (!enabled) return;
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = 0.07;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    [220, 329.63, 440].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * (index === 2 ? 2 : 1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(index === 2 ? 0.2 : 0.5, now + index * 0.12 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 1.7);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 1.8);
    });
    window.setTimeout(() => void ctx.close().catch(() => undefined), 2600);
  } catch {
    /* chime is decorative */
  }
}
