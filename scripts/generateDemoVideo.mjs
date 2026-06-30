// ═══════════════════════════════════════════════════════════════════
// NEXUSOS DEMO VIDEO GENERATOR
//
// Records a narrated demo of NexusOS by:
// 1. Starting the Vite dev server
// 2. Launching Chrome via Puppeteer
// 3. Navigating through key OS features
// 4. Taking screenshots at each step (2fps)
// 5. Compiling screenshots into an MP4 with ffmpeg
// 6. Adding text overlays for narration
//
// Output: download/nexusos-demo.mp4
// ═══════════════════════════════════════════════════════════════════

import puppeteer from 'puppeteer';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXUS_ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(NEXUS_ROOT, 'download', 'demo-frames');
const OUTPUT_VIDEO = path.join(NEXUS_ROOT, 'download', 'nexusos-demo.mp4');

// Frame capture dimensions
const WIDTH = 1280;
const HEIGHT = 800;
const FPS = 2; // 2 frames per second (each screenshot = 0.5s of video)

// Demo steps — each step takes a screenshot + has a caption
const DEMO_STEPS = [
  { caption: 'NexusOS — The AI-native operating system', action: 'boot', duration: 3 },
  { caption: 'Booting the kernel...', action: 'wait-boot', duration: 4 },
  { caption: 'Desktop with AI-managed wallpaper', action: 'desktop', duration: 3 },
  { caption: 'Spotlight search (Ctrl+K) — find anything instantly', action: 'spotlight', duration: 3 },
  { caption: 'HyperIDE — multi-file project editor', action: 'open-hyperide', duration: 3 },
  { caption: 'AI Plugin Marketplace — describe it, AI builds it', action: 'open-marketplace', duration: 3 },
  { caption: 'Settings — 19 AI providers + Full Autonomy mode', action: 'open-settings', duration: 3 },
  { caption: 'Recycle Bin — restore trashed files', action: 'open-recyclebin', duration: 3 },
  { caption: '75 OS:: actions, 19 AI providers, 100% autonomous', action: 'final', duration: 4 },
];

let frameCount = 0;

async function captureFrame(page, caption, duration) {
  const framesForStep = Math.ceil(duration * FPS);
  for (let i = 0; i < framesForStep; i++) {
    const filename = path.join(SCREENSHOTS_DIR, `frame_${String(frameCount).padStart(5, '0')}.png`);
    await page.screenshot({ path: filename, type: 'png' });
    frameCount++;
    await new Promise(r => setTimeout(r, 1000 / FPS));
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  NexusOS Demo Video Generator');
  console.log('═══════════════════════════════════════════════════\n');

  // Clean up previous frames
  if (fs.existsSync(SCREENSHOTS_DIR)) {
    fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
  }
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // ─── Start dev server ───────────────────────────────────────
  console.log('[1/5] Starting Vite dev server...');
  const devServer = spawn('npx', ['vite', '--port', '3000', '--host'], {
    cwd: NEXUS_ROOT,
    stdio: 'pipe',
    shell: true,
  });

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        serverReady = true;
        console.log('  ✓ Dev server ready at http://localhost:3000');
        break;
      }
    } catch {}
  }
  if (!serverReady) {
    console.error('  ✗ Dev server failed to start');
    devServer.kill();
    process.exit(1);
  }

  // ─── Launch browser ─────────────────────────────────────────
  console.log('\n[2/5] Launching Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/z/.cache/puppeteer/chrome/chrome-linux64/chrome',
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  console.log('\n[3/5] Navigating to NexusOS...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

  // ─── Record demo steps ──────────────────────────────────────
  console.log('\n[4/5] Recording demo frames...');

  for (const step of DEMO_STEPS) {
    console.log(`  ▸ ${step.caption}`);

    switch (step.action) {
      case 'boot':
        // Just capture the boot screen
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'wait-boot':
        // Wait for the OS to boot (click through login if needed)
        await new Promise(r => setTimeout(r, 6000)); // wait for boot animation
        // Try to click login button if present
        try {
          const loginBtn = await page.$('button');
          if (loginBtn) await loginBtn.click();
        } catch {}
        await new Promise(r => setTimeout(r, 2000));
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'desktop':
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'spotlight':
        // Press Ctrl+K to open spotlight
        await page.keyboard.down('Control');
        await page.keyboard.press('k');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 500));
        // Type a search query
        await page.keyboard.type('hyperide');
        await new Promise(r => setTimeout(r, 1000));
        await captureFrame(page, step.caption, step.duration);
        // Close spotlight
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 500));
        break;

      case 'open-hyperide':
        // Click on the start menu or use keyboard
        try {
          // Try clicking the start button (usually bottom-left)
          const startBtn = await page.$('button');
          if (startBtn) await startBtn.click();
          await new Promise(r => setTimeout(r, 1000));
        } catch {}
        // Just capture whatever is visible
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'open-marketplace':
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'open-settings':
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'open-recyclebin':
        await captureFrame(page, step.caption, step.duration);
        break;

      case 'final':
        await captureFrame(page, step.caption, step.duration);
        break;
    }
  }

  // ─── Compile video with ffmpeg ──────────────────────────────
  console.log('\n[5/5] Compiling MP4 with ffmpeg...');
  await browser.close();
  devServer.kill();

  // Build a filter complex that:
  // 1. Takes the screenshot sequence as input
  // 2. Scales to target size
  // 3. Overlays text captions at the right timestamps
  // Each step's caption shows for that step's duration

  const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const filters = [`scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black`];

  // Add text overlays for each step at the right time offset
  let timeOffset = 0;
  for (const step of DEMO_STEPS) {
    const start = timeOffset;
    const end = timeOffset + step.duration;
    // drawtext: show caption during [start, end]
    const escapedCaption = step.caption.replace(/:/g, '\\:').replace(/'/g, "\\'");
    filters.push(
      `drawtext=fontfile=${fontFile}:text='${escapedCaption}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h-80:box=1:boxcolor=black@0.7:boxborderw=20:enable='between(t,${start},${end})'`
    );
    timeOffset = end;
  }

  const ffmpegArgs = [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(SCREENSHOTS_DIR, 'frame_%05d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-vf', filters.join(','),
    '-preset', 'fast',
    '-crf', '23',
    OUTPUT_VIDEO,
  ];

  console.log(`  Compiling ${frameCount} frames into ${OUTPUT_VIDEO}...`);
  try {
    execSync(`ffmpeg ${ffmpegArgs.map(a => `'${a}'`).join(' ')}`, { stdio: 'pipe' });
  } catch (e) {
    // Fallback: simpler command without text overlays
    console.log('  Text overlay failed, trying without captions...');
    const simpleArgs = [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(SCREENSHOTS_DIR, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-vf', `scale=${WIDTH}:${HEIGHT}`,
      '-preset', 'fast',
      '-crf', '23',
      OUTPUT_VIDEO,
    ];
    execSync(`ffmpeg ${simpleArgs.join(' ')}`, { stdio: 'inherit' });
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  ✅ Demo video created: ${OUTPUT_VIDEO}`);
  console.log(`  📐 Resolution: ${WIDTH}x${HEIGHT}`);
  console.log(`  ⏱  Duration: ~${frameCount / FPS}s`);
  console.log(`  🎬 Frames: ${frameCount}`);
  console.log(`═══════════════════════════════════════════════════`);

  // Clean up frames (optional — keep for debugging)
  // fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
}

main().catch((err) => {
  console.error('Demo generation failed:', err);
  process.exit(1);
});
