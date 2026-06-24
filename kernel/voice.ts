// ═══════════════════════════════════════════════════════════════════
// VOICE KERNEL MODULE — Speech-to-text and text-to-speech
//
// Uses the Web Speech API (built into Chrome/Edge/Electron) for both
// STT (SpeechRecognition) and TTS (SpeechSynthesis). No backend
// required — everything runs locally in the browser.
//
// Used by:
//   - OS::SPEAK:<text> — the AI speaks text aloud
//   - OS::LISTEN — start listening for voice input
//   - The DAEMON Chat app — voice input button
//   - Accessibility features — screen reader mode
// ═══════════════════════════════════════════════════════════════════

import { eventBus } from './eventBus';
import { kernelLog } from './log';

class VoiceModule {
  private recognition: any = null;
  private isListening = false;
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // TTS setup
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        this.loadVoices();
        this.synthesis.onvoiceschanged = () => this.loadVoices();
      }

      // STT setup
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  private loadVoices() {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
    }
  }

  get isSupported(): boolean {
    return this.recognition !== null || this.synthesis !== null;
  }

  get isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  get isListeningActive(): boolean {
    return this.isListening;
  }

  /**
   * Speak text aloud using text-to-speech.
   */
  speak(text: string, options: { rate?: number; pitch?: number; voiceName?: string } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Text-to-speech not supported in this environment'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      // Select voice
      if (options.voiceName) {
        const voice = this.voices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      } else if (this.voices.length > 0) {
        // Prefer a natural-sounding English voice
        const preferred = this.voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
          || this.voices.find(v => v.lang.startsWith('en'))
          || this.voices[0];
        if (preferred) utterance.voice = preferred;
      }

      utterance.onend = () => {
        eventBus.emit('voice:speak-ended', { text });
        resolve();
      };
      utterance.onerror = (e) => {
        kernelLog.warn('[Voice] TTS error:', e.error);
        reject(new Error(`TTS error: ${e.error}`));
      };

      eventBus.emit('voice:speak-started', { text });
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop any ongoing speech.
   */
  stopSpeaking(): void {
    this.synthesis?.cancel();
  }

  /**
   * Start listening for voice input. Returns a promise that resolves
   * with the transcribed text when the user stops speaking.
   */
  listen(timeoutMs = 10000): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported in this environment'));
        return;
      }
      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      let finalTranscript = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { this.recognition.stop(); } catch {}
          if (finalTranscript) {
            resolve(finalTranscript);
          } else {
            reject(new Error('Listening timed out'));
          }
        }
      }, timeoutMs);

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            // Interim result — emit for live feedback
            eventBus.emit('voice:interim', { transcript });
          }
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        eventBus.emit('voice:listen-ended', { transcript: finalTranscript });
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (e: any) => {
        this.isListening = false;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`STT error: ${e.error}`));
        }
      };

      try {
        this.recognition.start();
        this.isListening = true;
        eventBus.emit('voice:listen-started', {});
      } catch (e: any) {
        clearTimeout(timeout);
        reject(new Error(`Failed to start recognition: ${e.message}`));
      }
    });
  }

  /**
   * Stop listening.
   */
  stopListening(): void {
    if (this.isListening && this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
  }

  /**
   * Get available TTS voices.
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

export const voice = new VoiceModule();
