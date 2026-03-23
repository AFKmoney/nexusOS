/**
 * THEME ENGINE — Centralized CSS variable system with accent color
 */

const THEME_KEY = 'nexus_theme_v1';

export interface NexusTheme {
  accent: string;        // hex color
  accentRgb: string;     // "16,185,129"
  surface: string;       // surface background
  surfaceAlt: string;    // card background
  text: string;          // primary text
  textMuted: string;     // secondary text
  border: string;        // border color
  fontFamily: string;
}

const ACCENT_PRESETS: Record<string, { hex: string; rgb: string }> = {
  emerald:  { hex: '#10b981', rgb: '16,185,129' },
  violet:   { hex: '#8b5cf6', rgb: '139,92,246' },
  cyan:     { hex: '#06b6d4', rgb: '6,182,212' },
  rose:     { hex: '#f43f5e', rgb: '244,63,94' },
  amber:    { hex: '#f59e0b', rgb: '245,158,11' },
  blue:     { hex: '#3b82f6', rgb: '59,130,246' },
};

const DEFAULT_THEME: NexusTheme = {
  accent: '#10b981',
  accentRgb: '16,185,129',
  surface: '#050508',
  surfaceAlt: 'rgba(23,23,23,0.6)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  border: 'rgba(255,255,255,0.05)',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};

class ThemeEngine {
  private theme: NexusTheme;

  constructor() {
    this.theme = { ...DEFAULT_THEME };
    this.load();
    this.apply();
  }

  private load() {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw) this.theme = { ...DEFAULT_THEME, ...JSON.parse(raw) };
    } catch {}
  }

  private persist() {
    localStorage.setItem(THEME_KEY, JSON.stringify(this.theme));
  }

  /** Apply theme to document root CSS variables */
  apply() {
    const root = document.documentElement;
    root.style.setProperty('--nx-accent', this.theme.accent);
    root.style.setProperty('--nx-accent-rgb', this.theme.accentRgb);
    root.style.setProperty('--nx-surface', this.theme.surface);
    root.style.setProperty('--nx-surface-alt', this.theme.surfaceAlt);
    root.style.setProperty('--nx-text', this.theme.text);
    root.style.setProperty('--nx-text-muted', this.theme.textMuted);
    root.style.setProperty('--nx-border', this.theme.border);
    root.style.setProperty('--nx-font', this.theme.fontFamily);
  }

  /** Set accent color by preset name */
  setAccent(presetName: string) {
    const preset = ACCENT_PRESETS[presetName];
    if (preset) {
      this.theme.accent = preset.hex;
      this.theme.accentRgb = preset.rgb;
      this.persist();
      this.apply();
    }
  }

  /** Set accent by custom hex */
  setCustomAccent(hex: string) {
    this.theme.accent = hex;
    // Parse hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.theme.accentRgb = `${r},${g},${b}`;
    this.persist();
    this.apply();
  }

  getTheme(): NexusTheme { return { ...this.theme }; }
  getAccentHex(): string { return this.theme.accent; }
  getAccentRgb(): string { return this.theme.accentRgb; }
  getPresets() { return ACCENT_PRESETS; }
}

export const themeEngine = new ThemeEngine();
