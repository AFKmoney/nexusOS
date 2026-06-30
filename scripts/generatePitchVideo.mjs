// ═══════════════════════════════════════════════════════════════════
// NEXUSOS PITCH VIDEO GENERATOR
//
// Generates a narrated explainer/pitch video about NexusOS:
//   1. Write a short script (8 scenes, ~75 seconds)
//   2. Synthesize neural voiceover with edge-tts (per-scene)
//   3. Build an animated HTML composition for each scene
//   4. Render HTML to screenshots with Puppeteer (one per scene)
//   5. Compile screenshots + audio into MP4 with ffmpeg
//
// Output: download/nexusos-pitch.mp4 (1920x1080, 16:9, narrated)
// ═══════════════════════════════════════════════════════════════════

import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXUS_ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(NEXUS_ROOT, 'download', 'pitch-work');
const HTML_DIR = path.join(WORK_DIR, 'html');
const AUDIO_DIR = path.join(WORK_DIR, 'audio');
const FRAMES_DIR = path.join(WORK_DIR, 'frames');
const OUTPUT_VIDEO = path.join(NEXUS_ROOT, 'download', 'nexusos-pitch.mp4');

const WIDTH = 1920;
const HEIGHT = 1080;

// ─── The pitch script ─────────────────────────────────────────────
// Each scene has: narration (for TTS), visual HTML, duration (seconds)
const SCENES = [
  {
    narration: "What if your operating system wasn't just a tool — but a collaborator? Meet NexusOS. The first AI-native operating system where the model lives in the kernel.",
    visual: 'hero',
    duration: 8,
  },
  {
    narration: "This isn't a chatbot bolted onto a desktop. NexusOS is built from the ground up for autonomy. The AI has real authority — it can write files, build apps, spawn agents, and modify its own skills.",
    visual: 'authority',
    duration: 9,
  },
  {
    narration: "Seventy-five structured actions. Nineteen AI providers. OpenAI, Anthropic, Google, Mistral, NVIDIA — with automatic failover. Native function calling means the AI never gets the syntax wrong.",
    visual: 'stats',
    duration: 8,
  },
  {
    narration: "The AI evolves. SkillForge lets it write JavaScript skills, persist them to its own filesystem, and invoke them later — each running in an isolated Web Worker sandbox for security.",
    visual: 'skillforge',
    duration: 9,
  },
  {
    narration: "It generates real applications. Not single HTML files — complete multi-file projects: manifest, HTML, CSS, JavaScript, documentation. Apps appear in the launcher and run instantly.",
    visual: 'appgen',
    duration: 8,
  },
  {
    narration: "AutoPilot gives the AI a goal queue with self-prompting. Add a goal, engage autopilot, and watch it work through tasks autonomously. It even writes reflections when idle.",
    visual: 'autopilot',
    duration: 8,
  },
  {
    narration: "It remembers. Every conversation is indexed in a vector store. Ask what you built last week — the AI recalls it semantically, not just by keyword.",
    visual: 'memory',
    duration: 7,
  },
  {
    narration: "Bounded by governance. A policy engine, mirror guard, four-tier trust hierarchy, and a human kill switch that survives reloads. Full Autonomy mode grants the AI your access level — but hard barriers always apply.",
    visual: 'governance',
    duration: 9,
  },
  {
    narration: "NexusOS. The operating system that thinks with you. Open source. MIT licensed. Available now.",
    visual: 'cta',
    duration: 6,
  },
];

// ─── HTML templates for each scene ────────────────────────────────
function getSceneHtml(scene, index) {
  const accent = '#10b981';
  const bg = '#050508';
  const fonts = "'Inter', system-ui, -apple-system, sans-serif";

  const common = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${WIDTH}px; height: ${HEIGHT}px;
        background: ${bg};
        color: #e2e8f0;
        font-family: ${fonts};
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        width: 100%; height: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 80px;
        position: relative;
      }
      .accent { color: ${accent}; }
      .glow { text-shadow: 0 0 40px ${accent}80; }
      .badge {
        display: inline-block;
        padding: 8px 20px;
        border: 1px solid ${accent}40;
        border-radius: 999px;
        font-size: 16px;
        font-weight: 700;
        color: ${accent};
        background: ${accent}10;
        margin-bottom: 32px;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .grid-bg {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(${accent}08 1px, transparent 1px),
          linear-gradient(90deg, ${accent}08 1px, transparent 1px);
        background-size: 60px 60px;
        opacity: 0.5;
      }
      .radial {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at center, ${accent}15 0%, transparent 60%);
      }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      .animate-in { animation: fadeIn 0.8s ease-out forwards; }
      .delay-1 { animation-delay: 0.2s; opacity: 0; }
      .delay-2 { animation-delay: 0.4s; opacity: 0; }
      .delay-3 { animation-delay: 0.6s; opacity: 0; }
      .delay-4 { animation-delay: 0.8s; opacity: 0; }
    </style>
  `;

  switch (scene.visual) {
    case 'hero':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">AI-NATIVE OPERATING SYSTEM</div>
          <h1 class="animate-in delay-1 glow" style="font-size: 96px; font-weight: 900; letter-spacing: -2px; margin-bottom: 24px;">
            Nexus<span class="accent">OS</span>
          </h1>
          <p class="animate-in delay-2" style="font-size: 32px; color: #94a3b8; font-weight: 300; max-width: 900px; text-align: center;">
            Where the model lives in the kernel.
          </p>
          <div class="animate-in delay-3" style="margin-top: 60px; display: flex; gap: 40px; font-size: 18px; color: #64748b;">
            <span>75 OS:: actions</span>
            <span>•</span>
            <span>19 AI providers</span>
            <span>•</span>
            <span>100% autonomous</span>
          </div>
        </div></body></html>`;

    case 'authority':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">REAL AUTHORITY</div>
          <h1 class="animate-in delay-1" style="font-size: 64px; font-weight: 800; margin-bottom: 40px; text-align: center;">
            Not a chatbot on the side.<br><span class="accent glow">A kernel-resident service.</span>
          </h1>
          <div class="animate-in delay-2" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 1200px; margin-top: 20px;">
            <div style="padding: 32px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 24px;">
              <div style="font-size: 48px; margin-bottom: 12px;">📁</div>
              <div style="font-size: 24px; font-weight: 700; color: white;">Write Files</div>
              <div style="font-size: 16px; color: #94a3b8;">VFS with IndexedDB persistence</div>
            </div>
            <div style="padding: 32px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 24px;">
              <div style="font-size: 48px; margin-bottom: 12px;">📦</div>
              <div style="font-size: 24px; font-weight: 700; color: white;">Build Apps</div>
              <div style="font-size: 16px; color: #94a3b8;">Multi-file project generation</div>
            </div>
            <div style="padding: 32px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 24px;">
              <div style="font-size: 48px; margin-bottom: 12px;">🤖</div>
              <div style="font-size: 24px; font-weight: 700; color: white;">Spawn Agents</div>
              <div style="font-size: 16px; color: #94a3b8;">Parallel multi-agent orchestration</div>
            </div>
            <div style="padding: 32px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 24px;">
              <div style="font-size: 48px; margin-bottom: 12px;">⚡</div>
              <div style="font-size: 24px; font-weight: 700; color: white;">Forge Skills</div>
              <div style="font-size: 16px; color: #94a3b8;">Self-evolving capabilities</div>
            </div>
          </div>
        </div></body></html>`;

    case 'stats':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">BY THE NUMBERS</div>
          <div style="display: flex; gap: 80px; align-items: center;">
            <div class="animate-in delay-1" style="text-align: center;">
              <div class="accent glow" style="font-size: 120px; font-weight: 900; line-height: 1;">75</div>
              <div style="font-size: 20px; color: #94a3b8; margin-top: 8px;">OS:: ACTIONS</div>
            </div>
            <div class="animate-in delay-2" style="text-align: center;">
              <div class="accent glow" style="font-size: 120px; font-weight: 900; line-height: 1;">19</div>
              <div style="font-size: 20px; color: #94a3b8; margin-top: 8px;">AI PROVIDERS</div>
            </div>
            <div class="animate-in delay-3" style="text-align: center;">
              <div class="accent glow" style="font-size: 120px; font-weight: 900; line-height: 1;">8</div>
              <div style="font-size: 20px; color: #94a3b8; margin-top: 8px;">AGENT ROLES</div>
            </div>
          </div>
          <div class="animate-in delay-4" style="margin-top: 60px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 1400px;">
            ${['OpenAI','Anthropic','Google','Mistral','NVIDIA NIM','Groq','xAI','DeepSeek','Cerebras','Perplexity','Zhipu','Together','Ollama','LM Studio','Wllama'].map(p =>
              `<span style="padding: 8px 16px; background: ${accent}10; border: 1px solid ${accent}30; border-radius: 8px; font-size: 16px; color: ${accent}; font-weight: 600;">${p}</span>`
            ).join('')}
          </div>
        </div></body></html>`;

    case 'skillforge':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">SELF-EVOLUTION</div>
          <h1 class="animate-in delay-1 glow" style="font-size: 72px; font-weight: 800; margin-bottom: 32px;">
            Skill<span class="accent">Forge</span> v2
          </h1>
          <p class="animate-in delay-2" style="font-size: 28px; color: #94a3b8; max-width: 1000px; text-align: center; margin-bottom: 48px;">
            The AI writes JavaScript skills, persists them, and invokes them later —<br>each running in an isolated Web Worker sandbox.
          </p>
          <div class="animate-in delay-3" style="display: flex; align-items: center; gap: 32px; background: #0a0a0f; padding: 32px; border-radius: 16px; border: 1px solid ${accent}20; font-family: 'Courier New', monospace; font-size: 18px; max-width: 1200px;">
            <div style="color: #64748b;">// @skill greet_user</div>
            <div style="color: #64748b;">// @desc Greet the user</div>
            <div style="color: ${accent};">const name = ctx.os.getWindows()[0]?.title;</div>
            <div style="color: #e2e8f0;">ctx.os.notify(<span style="color: #f59e0b;">'Hello'</span>, name);</div>
            <div style="color: ${accent};">return <span style="color: #f59e0b;">'Done'</span>;</div>
          </div>
          <div class="animate-in delay-4" style="margin-top: 32px; display: flex; gap: 16px;">
            <span style="padding: 8px 16px; background: #fbbf2410; border: 1px solid #fbbf2430; border-radius: 8px; color: #fbbf24; font-size: 14px;">🔒 SANDBOXED</span>
            <span style="padding: 8px 16px; background: ${accent}10; border: 1px solid ${accent}30; border-radius: 8px; color: ${accent}; font-size: 14px;">💾 PERSISTED</span>
            <span style="padding: 8px 16px; background: #3b82f610; border: 1px solid #3b82f630; border-radius: 8px; color: #3b82f6; font-size: 14px;">⚙️ EXECUTABLE</span>
          </div>
        </div></body></html>`;

    case 'appgen':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">REAL APP GENERATION</div>
          <h1 class="animate-in delay-1" style="font-size: 64px; font-weight: 800; margin-bottom: 40px; text-align: center;">
            Not a single HTML file.<br><span class="accent glow">A complete filesystem.</span>
          </h1>
          <div class="animate-in delay-2" style="display: flex; gap: 16px; font-family: 'Courier New', monospace; font-size: 20px;">
            <div style="background: #0a0a0f; padding: 32px; border-radius: 16px; border: 1px solid ${accent}20;">
              <div style="color: #64748b; margin-bottom: 16px;">📁 /system/apps/gen_abc/</div>
              <div style="color: ${accent};">├── manifest.json</div>
              <div style="color: #e2e8f0;">├── index.html</div>
              <div style="color: #e2e8f0;">├── styles.css</div>
              <div style="color: #e2e8f0;">├── app.js</div>
              <div style="color: #e2e8f0;">├── README.md</div>
              <div style="color: #64748b;">└── data/</div>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 16px;">
              <div style="padding: 16px 24px; background: ${accent}10; border-radius: 12px; border: 1px solid ${accent}30;">
                <div style="color: ${accent}; font-size: 16px; font-weight: 700;">✓ GENERATED</div>
                <div style="color: #94a3b8; font-size: 14px;">AI writes all files</div>
              </div>
              <div style="padding: 16px 24px; background: ${accent}10; border-radius: 12px; border: 1px solid ${accent}30;">
                <div style="color: ${accent}; font-size: 16px; font-weight: 700;">✓ REGISTERED</div>
                <div style="color: #94a3b8; font-size: 14px;">Appears in launcher</div>
              </div>
              <div style="padding: 16px 24px; background: ${accent}10; border-radius: 12px; border: 1px solid ${accent}30;">
                <div style="color: ${accent}; font-size: 16px; font-weight: 700;">✓ RUNNABLE</div>
                <div style="color: #94a3b8; font-size: 14px;">Instant preview</div>
              </div>
              <div style="padding: 16px 24px; background: ${accent}10; border-radius: 12px; border: 1px solid ${accent}30;">
                <div style="color: ${accent}; font-size: 16px; font-weight: 700;">✓ EDITABLE</div>
                <div style="color: #94a3b8; font-size: 14px;">Open in HyperIDE</div>
              </div>
            </div>
          </div>
        </div></body></html>`;

    case 'autopilot':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">AUTONOMOUS EXECUTION</div>
          <h1 class="animate-in delay-1 glow" style="font-size: 72px; font-weight: 800; margin-bottom: 32px;">
            Auto<span class="accent">Pilot</span>
          </h1>
          <p class="animate-in delay-2" style="font-size: 28px; color: #94a3b8; max-width: 1000px; text-align: center; margin-bottom: 48px;">
            Add a goal. Engage autopilot. The AI picks the next goal,<br>generates a plan, executes it, and marks it complete.
          </p>
          <div class="animate-in delay-3" style="display: flex; flex-direction: column; gap: 12px; width: 800px;">
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: ${accent}10; border-radius: 12px; border: 1px solid ${accent}30;">
              <span style="font-size: 24px;">✅</span>
              <span style="color: white; font-size: 18px;">Organize downloads folder</span>
              <span style="color: ${accent}; font-size: 14px; margin-left: auto;">COMPLETED</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fbbf2410; border-radius: 12px; border: 1px solid #fbbf2430;">
              <span style="font-size: 24px;">🔄</span>
              <span style="color: white; font-size: 18px;">Build a weather dashboard</span>
              <span style="color: #fbbf24; font-size: 14px; margin-left: auto;">IN PROGRESS</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
              <span style="font-size: 24px;">⏳</span>
              <span style="color: #94a3b8; font-size: 18px;">Review and summarize notes</span>
              <span style="color: #64748b; font-size: 14px; margin-left: auto;">PENDING</span>
            </div>
          </div>
        </div></body></html>`;

    case 'memory':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">EPISODIC MEMORY</div>
          <h1 class="animate-in delay-1" style="font-size: 64px; font-weight: 800; margin-bottom: 32px; text-align: center;">
            It <span class="accent glow">remembers</span>.
          </h1>
          <p class="animate-in delay-2" style="font-size: 28px; color: #94a3b8; max-width: 1000px; text-align: center; margin-bottom: 48px;">
            Every conversation is indexed in a vector store.<br>Ask what you built last week — recalled semantically.
          </p>
          <div class="animate-in delay-3" style="display: flex; gap: 24px; align-items: center;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
              <div style="color: ${accent}; font-size: 16px; font-weight: 700;">CONVERSATION</div>
              <div style="color: #64748b; font-size: 14px;">user + AI</div>
            </div>
            <div style="color: ${accent}; font-size: 32px;">→</div>
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🔢</div>
              <div style="color: ${accent}; font-size: 16px; font-weight: 700;">EMBEDDING</div>
              <div style="color: #64748b; font-size: 14px;">1024-dim vector</div>
            </div>
            <div style="color: ${accent}; font-size: 32px;">→</div>
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🗃️</div>
              <div style="color: ${accent}; font-size: 16px; font-weight: 700;">INDEXEDDB</div>
              <div style="color: #64748b; font-size: 14px;">persisted</div>
            </div>
            <div style="color: ${accent}; font-size: 32px;">→</div>
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
              <div style="color: ${accent}; font-size: 16px; font-weight: 700;">SEMANTIC SEARCH</div>
              <div style="color: #64748b; font-size: 14px;">cosine similarity</div>
            </div>
          </div>
        </div></body></html>`;

    case 'governance':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <div class="badge animate-in">SAFE BY DESIGN</div>
          <h1 class="animate-in delay-1" style="font-size: 56px; font-weight: 800; margin-bottom: 40px; text-align: center;">
            Bounded by <span class="accent glow">governance</span>.
          </h1>
          <div class="animate-in delay-2" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 1200px;">
            <div style="padding: 28px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 20px;">
              <div style="color: ${accent}; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Policy Engine</div>
              <div style="color: #94a3b8; font-size: 16px;">Deny-by-default. Every action classified.</div>
            </div>
            <div style="padding: 28px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 20px;">
              <div style="color: ${accent}; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Mirror Guard</div>
              <div style="color: #94a3b8; font-size: 16px;">Static + AI critique validation.</div>
            </div>
            <div style="padding: 28px; background: ${accent}08; border: 1px solid ${accent}20; border-radius: 20px;">
              <div style="color: ${accent}; font-size: 24px; font-weight: 800; margin-bottom: 8px;">4-Tier Trust</div>
              <div style="color: #94a3b8; font-size: 16px;">Doc → UI → App → Kernel scope.</div>
            </div>
            <div style="padding: 28px; background: #ef444408; border: 1px solid #ef444420; border-radius: 20px;">
              <div style="color: #ef4444; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Kill Switch</div>
              <div style="color: #94a3b8; font-size: 16px;">Human override survives reloads.</div>
            </div>
          </div>
          <div class="animate-in delay-3" style="margin-top: 32px; padding: 16px 32px; background: #ef444410; border: 1px solid #ef444420; border-radius: 12px;">
            <span style="color: #ef4444; font-weight: 700;">⚠ Hard barriers:</span>
            <span style="color: #94a3b8; font-size: 16px;"> system-reset · self-modify-code · kernel-rules — always require approval</span>
          </div>
        </div></body></html>`;

    case 'cta':
      return `<html><body><div class="grid-bg"></div><div class="radial"></div>
        <div class="container">
          <h1 class="animate-in glow" style="font-size: 96px; font-weight: 900; letter-spacing: -2px; margin-bottom: 24px;">
            Nexus<span class="accent">OS</span>
          </h1>
          <p class="animate-in delay-1" style="font-size: 36px; color: #94a3b8; font-weight: 300; margin-bottom: 48px;">
            The operating system that thinks with you.
          </p>
          <div class="animate-in delay-2" style="display: flex; gap: 24px; margin-bottom: 32px;">
            <span style="padding: 12px 32px; background: ${accent}; color: #050508; font-size: 20px; font-weight: 800; border-radius: 12px;">github.com/AFKmoney/nexusOS</span>
          </div>
          <div class="animate-in delay-3" style="display: flex; gap: 32px; color: #64748b; font-size: 18px;">
            <span>Open Source</span>
            <span>•</span>
            <span>MIT License</span>
            <span>•</span>
            <span>Available Now</span>
          </div>
        </div></body></html>`;
  }
}

// ─── Generate voiceover with edge-tts ─────────────────────────────
async function generateVoiceover(scene, index) {
  const audioPath = path.join(AUDIO_DIR, `scene_${String(index).padStart(2, '0')}.mp3`);
  const voice = 'en-US-AndrewMultilingualNeural'; // natural, professional male voice
  const args = [
    '-c', `edge-tts --text "${scene.narration.replace(/"/g, '\\"')}" --voice "${voice}" --write-media "${audioPath}"`,
  ];
  console.log(`    TTS: scene ${index}...`);
  const result = spawn('sh', args, { stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    result.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`edge-tts failed with code ${code}`));
    });
    result.on('error', reject);
  });
  return audioPath;
}

// ─── Get audio duration ───────────────────────────────────────────
function getAudioDuration(audioPath) {
  try {
    const output = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: 'utf-8' }
    ).trim();
    return parseFloat(output);
  } catch {
    return 8; // fallback
  }
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  NexusOS Pitch Video Generator');
  console.log('═══════════════════════════════════════════════════\n');

  // Setup directories
  for (const dir of [WORK_DIR, HTML_DIR, AUDIO_DIR, FRAMES_DIR]) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  // ─── Step 1: Generate HTML for each scene ───────────────────
  console.log('[1/5] Generating scene HTML...');
  for (let i = 0; i < SCENES.length; i++) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${getSceneHtml(SCENES[i], i)}</head></html>`;
    fs.writeFileSync(path.join(HTML_DIR, `scene_${String(i).padStart(2, '0')}.html`), html);
  }
  console.log(`  ✓ ${SCENES.length} scenes generated`);

  // ─── Step 2: Generate voiceover for each scene ──────────────
  console.log('\n[2/5] Synthesizing voiceover with edge-tts...');
  const audioPaths = [];
  for (let i = 0; i < SCENES.length; i++) {
    const audioPath = await generateVoiceover(SCENES[i], i);
    audioPaths.push(audioPath);
  }
  console.log(`  ✓ ${audioPaths.length} audio tracks synthesized`);

  // ─── Step 3: Get durations ──────────────────────────────────
  console.log('\n[3/5] Calculating scene durations...');
  const durations = audioPaths.map(p => getAudioDuration(p));
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  console.log(`  ✓ Total duration: ${totalDuration.toFixed(1)}s`);

  // ─── Step 4: Render HTML to screenshots ─────────────────────
  console.log('\n[4/5] Rendering scenes with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/z/.cache/puppeteer/chrome/chrome-linux64/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const framePaths = [];
  for (let i = 0; i < SCENES.length; i++) {
    const htmlPath = path.join(HTML_DIR, `scene_${String(i).padStart(2, '0')}.html`);
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500)); // let animations start
    const framePath = path.join(FRAMES_DIR, `scene_${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    framePaths.push(framePath);
    console.log(`  ✓ Scene ${i + 1}/${SCENES.length} rendered`);
  }
  await browser.close();

  // ─── Step 5: Compile video with ffmpeg ──────────────────────
  console.log('\n[5/5] Compiling MP4 with ffmpeg...');

  // Build a concat file that maps each frame to its audio + duration
  const concatList = path.join(WORK_DIR, 'concat.txt');
  const intermediateVideos = [];

  for (let i = 0; i < SCENES.length; i++) {
    const framePath = framePaths[i];
    const audioPath = audioPaths[i];
    const duration = durations[i];
    const intermediateVideo = path.join(WORK_DIR, `scene_${String(i).padStart(2, '0')}.mp4`);

    // Create a video segment: static image + audio, exact duration
    const cmd = `ffmpeg -y -loop 1 -i "${framePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -vf "scale=${WIDTH}:${HEIGHT}" -t ${duration} "${intermediateVideo}"`;
    execSync(cmd, { stdio: 'pipe' });
    intermediateVideos.push(intermediateVideo);
    console.log(`  ✓ Segment ${i + 1}/${SCENES.length} compiled`);
  }

  // Concat all segments
  const concatContent = intermediateVideos.map(v => `file '${v}'`).join('\n');
  fs.writeFileSync(concatList, concatContent);

  console.log('  Concatenating segments...');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${OUTPUT_VIDEO}"`,
    { stdio: 'pipe' }
  );

  // Clean up working files (keep the video)
  // fs.rmSync(WORK_DIR, { recursive: true });

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  ✅ Pitch video created: ${OUTPUT_VIDEO}`);
  console.log(`  📐 Resolution: ${WIDTH}x${HEIGHT} (16:9)`);
  console.log(`  ⏱  Duration: ${totalDuration.toFixed(1)}s`);
  console.log(`  🎙️  Voiceover: en-US-AndrewMultilingualNeural`);
  console.log(`  🎬 Scenes: ${SCENES.length}`);
  console.log(`═══════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error('Video generation failed:', err);
  process.exit(1);
});
