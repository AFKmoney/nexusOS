// ═══════════════════════════════════════════════════════════════════
// CODE EXECUTION KERNEL MODULE — Sandboxed code execution
//
// Lets the AI execute code that it generates, closing the loop between
// "write code" and "verify it works". Two backends:
//
//   - Browser mode: executes JavaScript in a sandboxed iframe with
//     a limited scope (no access to window, document, or the OS).
//     Python is supported via Pyodide (lazy-loaded, ~10MB WASM).
//
//   - Electron mode: delegates to the main process which can spawn
//     a real child process (node, python3, etc.) with a timeout.
//     This is the only mode that gives true system-level execution.
//
// Used by OS::EXEC_CODE:<lang>:<code> to let the AI test its work.
// ═══════════════════════════════════════════════════════════════════

import { kernelLog } from './log';

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

class CodeExecutor {
  /**
   * Execute code in the specified language. Returns stdout/stderr.
   * Supported languages: javascript, js, typescript, ts (browser + Electron),
   * python, py (Pyodide in browser, python3 in Electron), shell, sh (Electron only).
   */
  async execute(language: string, code: string, timeoutMs = 10000): Promise<ExecResult> {
    const lang = language.toLowerCase().trim();
    const start = Date.now();

    try {
      // Electron mode — delegate to main process for real execution
      if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
        const res = await (window as any).electron.invoke('exec-code', {
          language: lang,
          code,
          timeoutMs,
        });
        return {
          success: res.success,
          stdout: res.stdout || '',
          stderr: res.stderr || '',
          exitCode: res.exitCode ?? null,
          durationMs: Date.now() - start,
        };
      }

      // Browser mode — limited execution
      if (lang === 'javascript' || lang === 'js') {
        return await this.execJsBrowser(code, timeoutMs);
      }
      if (lang === 'python' || lang === 'py') {
        return await this.execPythonBrowser(code, timeoutMs);
      }
      if (lang === 'typescript' || lang === 'ts') {
        // Strip types and run as JS (very basic — just removes type annotations)
        const jsCode = this.stripTypes(code);
        return await this.execJsBrowser(jsCode, timeoutMs);
      }

      return {
        success: false,
        stdout: '',
        stderr: `Language "${lang}" not supported in browser mode. Use Electron for shell/system languages.`,
        exitCode: null,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        stdout: '',
        stderr: e.message,
        exitCode: null,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Execute JavaScript in a sandboxed iframe. The iframe has no access
   * to the parent window, document, or the OS. We provide a minimal
   * console object that captures stdout/stderr.
   */
  private async execJsBrowser(code: string, timeoutMs: number): Promise<ExecResult> {
    const start = Date.now();
    const stdout: string[] = [];
    const stderr: string[] = [];

    // Create a sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts');
    document.body.appendChild(iframe);

    const sandbox = `
      <html><body><script>
        const __stdout = [];
        const __stderr = [];
        const console = {
          log: (...args) => __stdout.push(args.map(String).join(' ')),
          error: (...args) => __stderr.push(args.map(String).join(' ')),
          warn: (...args) => __stderr.push(args.map(String).join(' ')),
          info: (...args) => __stdout.push(args.map(String).join(' ')),
        };
        try {
          const __result = (function() { ${code} })();
          if (__result !== undefined) __stdout.push('→ ' + String(__result));
        } catch (e) {
          __stderr.push(e.message);
        }
        window.__output = { stdout: __stdout, stderr: __stderr };
      <\/script></body></html>
    `;

    return new Promise((resolve) => {
      const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve({
          success: false,
          stdout: stdout.join('\n'),
          stderr: 'Execution timed out',
          exitCode: null,
          durationMs: Date.now() - start,
        });
      }, timeoutMs);

      iframe.onload = () => {
        clearTimeout(timeout);
        try {
          const win = iframe.contentWindow as any;
          const output = win?.__output || { stdout: [], stderr: [] };
          const hasErrors = output.stderr.length > 0;
          resolve({
            success: !hasErrors,
            stdout: output.stdout.join('\n'),
            stderr: output.stderr.join('\n'),
            exitCode: hasErrors ? 1 : 0,
            durationMs: Date.now() - start,
          });
        } catch (e: any) {
          resolve({
            success: false,
            stdout: '',
            stderr: `Sandbox error: ${e.message}`,
            exitCode: null,
            durationMs: Date.now() - start,
          });
        } finally {
          cleanup();
        }
      };

      iframe.srcdoc = sandbox;
    });
  }

  /**
   * Execute Python via Pyodide (lazy-loaded on first use).
   * Downloads ~10MB of WASM on first call, then cached.
   */
  private async execPythonBrowser(code: string, _timeoutMs: number): Promise<ExecResult> {
    const start = Date.now();
    const stdout: string[] = [];
    const stderr: string[] = [];

    try {
      // Lazy-load Pyodide
      if (!(window as any).loadPyodide) {
        await this.loadPyodideScript();
      }
      if (!(window as any).__pyodide) {
        kernelLog.info('[CodeExec] Loading Pyodide WASM (~10MB, first run only)...');
        (window as any).__pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
        });
      }

      const pyodide = (window as any).__pyodide;
      pyodide.setStdout({ batched: (s: string) => stdout.push(s) });
      pyodide.setStderr({ batched: (s: string) => stderr.push(s) });

      await pyodide.runPythonAsync(code);

      return {
        success: stderr.length === 0,
        stdout: stdout.join('\n'),
        stderr: stderr.join('\n'),
        exitCode: stderr.length > 0 ? 1 : 0,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        success: false,
        stdout: stdout.join('\n'),
        stderr: e.message,
        exitCode: 1,
        durationMs: Date.now() - start,
      };
    }
  }

  private loadPyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide'));
      document.head.appendChild(script);
    });
  }

  /**
   * Very basic TypeScript → JS stripping. Removes `: Type` annotations
   * and `interface`/`type` declarations. Not a real compiler — just
   * enough for simple scripts.
   */
  private stripTypes(ts: string): string {
    return ts
      .replace(/^\s*(interface|type)\s+\w+[\s\S]*?\n}/gm, '') // remove type/interface decls
      .replace(/:\s*([A-Z]\w*|string|number|boolean|any|void|null|undefined)(\[\])?(\s*[,\)])/g, '$3') // strip return types
      .replace(/:\s*([A-Z]\w*|string|number|boolean|any|void)(\[\])?(\s*=)/g, '$3'); // strip var types
  }
}

export const codeExecutor = new CodeExecutor();
