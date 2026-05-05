# NexusPortable — Mobile PWA and Android APK

NexusPortable is the complete mobile-first edition of NexusOS. It is a standalone React 19 + Vite 6 Progressive Web App that runs in any modern mobile browser and ships as a native Android APK via Capacitor.

It shares the same AI architecture, design system, and default values as the desktop version but replaces the window-manager shell with a full-screen stack navigator optimised for one-handed touch use.

---

## Quick start (browser / PWA)

```bash
npm install
npm run dev
# → http://localhost:5173
```

Open the URL on your phone, tap the browser menu, and choose **Add to Home Screen**. The app installs with `display: standalone`, appears on your home screen, and persists all state in `localStorage`.

---

## Production build

```bash
npm run build    # outputs to dist/
```

Serve `dist/` from any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

---

## Android APK (Capacitor)

### Prerequisites

- Node.js 18+
- Android Studio (includes Android SDK, API 36 / min API 24)
- JDK 17 or 21

### Build

```bash
# 1. Build the web app
npm run build

# 2. Sync to Android project
npx cap sync android

# 3. Build debug APK
cd android
./gradlew assembleDebug

# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or transfer the `.apk` file to your device and open it (enable *Install unknown apps* for your file manager).

### Signed release APK

```bash
# Generate a keystore once
keytool -genkey -v -keystore nexusos-release.jks \
  -alias nexusos -keyalg RSA -keysize 2048 -validity 10000

# Build signed APK
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$(pwd)/../nexusos-release.jks \
  -Pandroid.injected.signing.store.password=YOUR_STORE_PASS \
  -Pandroid.injected.signing.key.alias=nexusos \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASS
```

---

## CI / CD

The workflow `.github/workflows/build-android-apk.yml` triggers on every `v*` tag push and produces:

| Artifact | Condition |
|---|---|
| Debug APK (Actions artifact, 30-day retention) | Always |
| Signed release APK (attached to GitHub Release) | When `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` secrets are set |

---

## Architecture

### Shell model

| Desktop | NexusPortable |
|---|---|
| Z-indexed draggable windows (`react-rnd`) | Full-screen stack (`openApp / goBack / closeApp`) |
| Multi-workspace taskbar | Swipe-to-open drawer |
| Window manager in `App.tsx` | Stack navigator in `App.tsx` |

### State store (`store/mobileStore.ts`)

Fully aligned with the desktop `osStoreConstants.ts`:

| Field | Default | Desktop equivalent |
|---|---|---|
| `kernelRules.modelId` | `'claude-sonnet-4-6'` | `modelId` |
| `kernelRules.verbosity` | `0.7` | `verbosity` (0–1 float) |
| `kernelRules.creativity` | `0.8` | `creativity` (0–1 float) |
| `kernelRules.primaryBootDevice` | `'VFS'` | `primaryBootDevice` |
| `profiles[0].id` | `'daemon'` | DAEMON Core profile |
| `accentColor` | `'#10b981'` | emerald-500 |

### Mobile-first CSS (`index.css`)

- Safe-area insets: `env(safe-area-inset-top/bottom)` applied to status bar and nav bar
- All inputs: `font-size: 16px` (prevents iOS Safari auto-zoom)
- Shell root: `touch-action: manipulation; -webkit-tap-highlight-color: transparent`
- Body: `overscroll-behavior: none` (prevents pull-to-refresh conflicts)
- `viewport-fit=cover` in `<meta name="viewport">`

---

## Apps (27 total)

| ID | Name | Description |
|---|---|---|
| `terminal` | Terminal | Unix shell emulator |
| `daemon_chat` | DAEMON | Neural AI assistant (Anthropic API) |
| `notepad` | Notes | Quick notes editor |
| `explorer` | Files | Virtual file system browser |
| `settings` | Settings | System configuration |
| `dashboard` | Dashboard | System metrics + DAEMON status |
| `calculator` | Calculator | Scientific calculator |
| `calendar` | Calendar | Events and scheduling |
| `browser` | Browser | In-app web browser |
| `weather` | Weather | Weather forecast |
| `music` | Music | Music player |
| `kanban` | Kanban | Drag-free task board |
| `voice` | Recorder | Voice recorder |
| `contacts` | Contacts | Address book |
| `pomodoro` | Pomodoro | Focus timer |
| `markdown` | Markdown | Markdown editor + viewer |
| `appstore` | App Store | App discovery |
| `welcome` | Welcome | Onboarding (2-page) |
| `hyperide` | HyperIDE | Code editor with JS/TS eval |
| `sticky_notes` | Sticky Notes | Color-coded notes |
| `habits` | Habits | Habit tracker with streaks |
| `sysinfo` | System Info | Device + browser stats |
| `clipboard` | Clipboard | Clipboard history manager |
| `silence` | Cipher Vault | PIN-locked password manager |
| `model_manager` | Models | AI model selector (Anthropic / OpenAI / Google / Groq) |
| `aion_agent` | NEXUS.PRIME | Autonomous mission executor |
| `forge` | NeuralForge | AI-powered app builder |

---

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript (strict) |
| State | Zustand 5 with `localStorage` persistence |
| Build | Vite 6.4 |
| Styling | Tailwind 3.4, CSS custom properties |
| Mobile packaging | Capacitor 7, Android WebView API 24+ |
| AI | Anthropic API via `fetch` (direct browser access) |

## Build output

```
dist/assets/index-*.css   28.5 KB  (6.7 KB gzip)
dist/assets/lucide-*.js   40.6 KB  (8.7 KB gzip)
dist/assets/index-*.js   351.5 KB (96.7 KB gzip)
```
