# NexusOS — Viral Launch Kit

## 60-Second Demo Script (for screen recording)

```
TIMELINE          ACTION                          WHAT TO SHOW
────────────────  ──────────────────────────────  ──────────────────────────────
0:00 - 0:05       Boot NexusOS                    Boot screen → login → desktop
0:05 - 0:10       Show the desktop                Animated wallpaper, clock, taskbar
0:10 - 0:15       Open DAEMON Chat                "Build me a calculator app"
0:15 - 0:25       AI generates app                OS::BUILD_APP → app appears on desktop
0:25 - 0:30       Open Terminal                   Type: "search the web for Rust tutorials"
0:30 - 0:38       AI searches web                 OS::WEB_SEARCH → results displayed
0:38 - 0:43       AI saves note                   OS::WRITE_FILE → file appears
0:43 - 0:48       Open Governance Dashboard       Show proposals, audit log, trust tiers
0:48 - 0:53       Trigger self-evolution          OS::SELF_EVOLVE → proposal created
0:53 - 0:58       AI speaks                       OS::SPEAK → "All systems operational"
0:58 - 1:00       End card                        "NexusOS — AI in the kernel"
```

## Social Media Posts

### Twitter/X (280 chars)
```
🧠 I built an OS where the AI lives inside the kernel.

Not a chatbot sidebar. A real OS — VFS, process manager, Unix shell — with 50 validated actions the AI can take.

It can:
• Open apps
• Write files
• Commit to Git
• Search the web
• See the screen
• Modify its own code

github.com/AFKmoney/nexusOS
```

### Reddit r/LocalLLaMA title
```
NexusOS: An AI-native operating system that runs GGUF models in-browser (no backend) and gives the AI 50 kernel-level actions
```

### Hacker News title
```
Show HN: NexusOS — An AI-native OS where the model lives in the kernel (50 actions, self-evolving, local-first)
```

## Comparison Table (for blog posts / comments)

| Feature | NexusOS | Cursor | OpenHands | Claude CU | Replit Agent |
|---|:---:|:---:|:---:|:---:|:---:|
| Real OS shell | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI in kernel | ✅ | ❌ | ❌ | ❌ | ❌ |
| 50 OS:: actions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Self-governing autonomy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Local-first (GGUF in-browser) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Self-evolving | ✅ | ❌ | ❌ | ❌ | ❌ |
| Device clustering | ✅ | ❌ | ❌ | ❌ | ❌ |
| Git | ✅ | ✅ | ✅ | ❌ | ✅ |
| Multi-agent | ✅ | ❌ | ✅ | ❌ | ❌ |
| Code execution | ✅ | ❌ | ✅ | ❌ | ✅ |
| Voice I/O | ✅ | ❌ | ❌ | ❌ | ❌ |
| RAG | ✅ | ✅ | ❌ | ❌ | ❌ |
| Open source (MIT) | ✅ | ❌ | ✅ | ❌ | ❌ |

## GIF-Ready Demo Flow (for Reddit/imgur)

1. **Boot** → login → desktop with animated wallpaper (2s)
2. **Type in DAEMON Chat**: "Open terminal and write a file called hello.txt" (3s)
3. **Show**: Terminal opens, file appears in File Explorer (3s)
4. **Type**: "Search the web for NexusOS" (2s)
5. **Show**: Web search results appear (2s)
6. **Type**: "Commit this to git" (2s)
7. **Show**: Git log with AI commit (2s)
8. **End card**: NexusOS logo + "github.com/AFKmoney/nexusOS" (2s)

Total: ~16 seconds — perfect for a GIF.

## Hashtags
```
#NexusOS #AI #OperatingSystem #OpenSource #LocalAI #LLM #TypeScript 
#Electron #GGUF #Wllama #SelfEvolving #AINative #SovereignAI
```

## VPS Deployment (1-command)

```bash
# On a fresh Ubuntu VPS:
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS
docker build -t nexusos-demo .
docker run -d -p 80:80 --name nexusos nexusos-demo
# Visit: http://YOUR_VPS_IP
```

## Demo Mode

Add `?demo=true` to any NexusOS URL to auto-start the 50-action demo:
```
http://YOUR_VPS_IP/?demo=true
```

The demo automatically:
1. Waits for boot + login
2. Executes all 50 OS:: actions with narration
3. Shows results in the autonomy log + notifications

## Quick Stats for Posts

- **53 kernel modules** in TypeScript
- **50 OS:: actions** across 7 categories
- **54 built-in applications**
- **19 AI providers** (OpenAI, Anthropic, Google, NVIDIA, Mistral, etc.)
- **154 tests** passing
- **~34,000 lines** of TypeScript
- **MIT licensed** — fully open source
