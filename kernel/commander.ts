
import { vfs } from './fileSystem';
import { memory } from './memory';
import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { KernelRules } from '../types';

export class Commander {
    public async execute(
        cmd: string,
        log: (text: string, type: 'in' | 'out' | 'ai') => void,
        kernelRules: KernelRules,
        onStream?: (text: string) => void
    ) {
        const raw = cmd.trim();
        if (!raw) return;
        log(`exec: ${raw}`, 'in');

        const args: string[] = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ' ' && !inQuote) {
                if (current) args.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        if (current) args.push(current);

        const command = args[0]?.toLowerCase();
        const os = useOS.getState();

        if (command === 'sysinfo') {
            const apps = os.registry.length;
            const wins = os.windows.length;
            log(`[NEXUS SYSTEM INFO]\nKernel: v10.5.5\nRegistry Modules: ${apps}\nActive Instances: ${wins}`, 'out');
            return;
        }

        if (command === 'inspect') {
            const file = args[1];
            if (!file) { log('Usage: inspect <filename>', 'out'); return; }
            const path = file.startsWith('/') ? file : `/home/user/Desktop/${file}`;
            const content = vfs.readFile(path);
            if (content !== null) {
                log(`[ROUTING] Opening ${path} in Notepad for analysis.`, 'out');
                os.openWindow('notepad', { path, content });
            } else {
                log('Target module not found.', 'out');
            }
            return;
        }

        // [NEURAL FORGE PIPELINE] - Strictly for automatic manifestation
        if (['forge', 'build', 'create', 'make'].includes(command) && args.length > 1) {
            // Robust prompt extraction: everything after the first word
            const firstSpace = raw.indexOf(' ');
            const promptText = raw.substring(firstSpace + 1).trim().replace(/^['"]|['"]$/g, '');

            log(`[MANIFESTING] Initiating Forge Synthesis Pipeline: "${promptText}"`, 'out');

            // Ensure autoRun and mode: 'coder' are set to bypass chat logic
            os.openWindow('forge', {
                autoPrompt: promptText,
                autoRun: true,
                mode: 'coder'
            });
            return;
        }

        if (command === 'write') {
            if (args.length < 3) { log('Usage: write <path> "content"', 'out'); return; }
            const path = args[1];
            const content = args.slice(2).join(' ').replace(/^"|"$/g, '');
            const success = vfs.writeFile(path, content);
            if (success) log(`VFS: Sync successful at ${path}`, 'out');
            else log(`VFS: Sync failure`, 'out');
            return;
        }

        if (command === 'rm') {
            const path = args[1];
            if (path) {
                const success = vfs.delete(path);
                log(success ? `Purged ${path}` : `Path void`, 'out');
            }
            return;
        }

        if (command === 'ls') {
            const path = args[1] || '/home/user/Desktop';
            const files = vfs.listDir(path);
            log(files.length ? files.join('\n') : 'Node empty.', 'out');
            return;
        }

        if (command === 'close') {
            const targetId = args[1] || os.activeWindowId;
            if (targetId) os.closeWindow(targetId);
            return;
        }

        try {
            let fullBuffer = "";
            let toolTriggered = false;
            if (onStream) {
                await aiService.streamChat(raw, kernelRules, (token) => {
                    fullBuffer += token;
                    const match = fullBuffer.match(/\[\[BUILD:\s*([\s\S]+?)\]\]/i);
                    if (match && !toolTriggered) {
                        toolTriggered = true;
                        os.openWindow('forge', { autoPrompt: match[1].trim(), autoRun: true, mode: 'coder' });
                    } else if (!toolTriggered) onStream(token);
                });
            } else {
                const res = await aiService.generateOnce(raw, kernelRules);
                log(res, 'ai');
            }
        } catch (e) { log("Core link broken.", 'out'); }
    }
}

export const commander = new Commander();
