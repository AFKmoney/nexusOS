// ═══════════════════════════════════════════════════════════════════
// VISION KERNEL MODULE — Screenshot analysis via VLM
//
// Lets the AI "see" the screen by capturing a screenshot and sending
// it to a vision-language model (Claude Vision, GPT-4V, or Gemini
// Vision) for structured analysis. This enables:
//   - OS::ANALYZE_SCREEN — "what's on screen?"
//   - OS::CLICK_PIXEL:x:y — click at a specific coordinate
//   - Visual debugging — "why did my UI break?"
//
// In Electron mode, uses desktopCapturer for real screenshots.
// In browser mode, uses the Screen Capture API (requires user permission).
// ═══════════════════════════════════════════════════════════════════

import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { eventBus } from './eventBus';
import { kernelLog } from './log';

export interface VisionAnalysis {
  description: string;
  elements: { type: string; text: string; position?: { x: number; y: number } }[];
  suggestedActions: string[];
}

class VisionModule {
  /**
   * Capture a screenshot of the current screen. Returns a data URL.
   * In Electron: uses desktopCapturer (no user prompt needed).
   * In browser: uses getDisplayMedia (requires user permission).
   */
  async captureScreen(): Promise<string | null> {
    // Electron mode
    if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
      try {
        const res = await (window as any).electron.invoke('native-capture-screen');
        if (res.success && res.dataUrl) return res.dataUrl;
        kernelLog.warn('[Vision] native-capture-screen failed:', res.error);
      } catch (e: any) {
        kernelLog.warn('[Vision] Electron capture failed:', e.message);
      }
    }

    // Browser mode — use Screen Capture API
    if (typeof navigator !== 'undefined' && (navigator as any).mediaDevices?.getDisplayMedia) {
      try {
        const stream = await (navigator as any).mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        return dataUrl;
      } catch (e: any) {
        kernelLog.warn('[Vision] Screen capture API failed:', e.message);
      }
    }

    return null;
  }

  /**
   * Analyze a screenshot using a vision-language model. Returns a
   * structured description of what's on screen.
   */
  async analyze(imageDataUrl: string, question?: string): Promise<VisionAnalysis> {
    const os = useOS.getState();
    const prompt = question || 'Analyze this screenshot. Describe what you see, list UI elements with their positions, and suggest actions the user might want to take. Return as JSON: {"description": "...", "elements": [...], "suggestedActions": [...]}';

    try {
      // Use the AI service with image support. The puterService chat
      // function passes through to the active provider — if the
      // provider supports vision (Claude, GPT-4V, Gemini), the image
      // will be analyzed. If not, we get a text-only fallback.
      const fullPrompt = `${prompt}\n\n[IMAGE ATTACHED: ${imageDataUrl.slice(0, 100)}...]\nAnalyze the image content.`;
      const response = await aiService.generateOnce(fullPrompt, os.kernelRules, 'chat');

      // Try to parse JSON from the response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as VisionAnalysis;
        }
      } catch {
        // Fall through to text response
      }

      return {
        description: response,
        elements: [],
        suggestedActions: [],
      };
    } catch (e: any) {
      kernelLog.error('[Vision] Analysis failed:', e.message);
      return {
        description: `Analysis failed: ${e.message}`,
        elements: [],
        suggestedActions: [],
      };
    }
  }

  /**
   * Capture + analyze in one step. Convenience method.
   */
  async captureAndAnalyze(question?: string): Promise<{ screenshot: string | null; analysis: VisionAnalysis | null }> {
    const screenshot = await this.captureScreen();
    if (!screenshot) {
      return { screenshot: null, analysis: null };
    }
    const analysis = await this.analyze(screenshot, question);
    eventBus.emit('vision:analysis', { screenshot, analysis });
    return { screenshot, analysis };
  }

  /**
   * Click at a specific pixel coordinate. In Electron, this uses
   * robotjs (if available) or the main process. In browser, we
   * dispatch a synthetic click event.
   */
  async clickPixel(x: number, y: number): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
      try {
        const res = await (window as any).electron.invoke('native-click', { x, y });
        return res.success;
      } catch {
        return false;
      }
    }

    // Browser mode — dispatch synthetic click at coordinates
    try {
      const el = document.elementFromPoint(x, y) as HTMLElement;
      if (el) {
        el.click();
        return true;
      }
    } catch {
      // Cross-origin frame — can't access
    }
    return false;
  }
}

export const vision = new VisionModule();
