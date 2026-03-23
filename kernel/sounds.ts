/**
 * SYSTEM SOUNDS — Audio feedback for OS events
 * Uses Web Audio API oscillators (zero external files needed)
 */

class SystemSounds {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', vol?: number) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol ?? this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  /** Boot sound — ascending chord */
  boot() {
    this.beep(220, 0.15, 'sine');
    setTimeout(() => this.beep(330, 0.15, 'sine'), 100);
    setTimeout(() => this.beep(440, 0.15, 'sine'), 200);
    setTimeout(() => this.beep(660, 0.3, 'sine', 0.15), 300);
  }

  /** Click — short tick */
  click() { this.beep(800, 0.05, 'square', 0.1); }

  /** Notification — double ding */
  notify() {
    this.beep(880, 0.1, 'sine', 0.2);
    setTimeout(() => this.beep(1100, 0.15, 'sine', 0.15), 120);
  }

  /** Error — low buzz */
  error() {
    this.beep(150, 0.2, 'sawtooth', 0.15);
    setTimeout(() => this.beep(130, 0.25, 'sawtooth', 0.1), 150);
  }

  /** Success — happy ding */
  success() {
    this.beep(523, 0.1, 'sine', 0.2);
    setTimeout(() => this.beep(659, 0.1, 'sine', 0.2), 80);
    setTimeout(() => this.beep(784, 0.2, 'sine', 0.15), 160);
  }

  /** Window open — soft pop */
  windowOpen() { this.beep(600, 0.08, 'sine', 0.15); }

  /** Window close — soft drop */
  windowClose() { this.beep(400, 0.08, 'sine', 0.1); }

  /** Typing tick — very subtle */
  keystroke() { this.beep(1200, 0.02, 'square', 0.03); }

  /** Lock screen — descending */
  lock() {
    this.beep(660, 0.1);
    setTimeout(() => this.beep(440, 0.15), 80);
    setTimeout(() => this.beep(330, 0.25), 160);
  }

  setEnabled(val: boolean) { this.enabled = val; }
  isEnabled(): boolean { return this.enabled; }
  setVolume(vol: number) { this.volume = Math.max(0, Math.min(1, vol)); }
  getVolume(): number { return this.volume; }
}

export const sounds = new SystemSounds();
