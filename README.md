<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS Logo" width="250" height="250" style="border-radius: 50%; box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);">
</div>

<h1 align="center">█ NEXUS OS v11.0 █</h1>
<h3 align="center">Powered by DAEMON Core Intelligence</h3>

<div align="center">
  <p><strong>Not a WebApp. A Native Sovereign OS Environment.</strong></p>
</div>

<div align="center">
  <img src="https://img.shields.io/badge/Architecture-Fractal_State-10b981?style=for-the-badge&logo=electron" alt="Architecture" />
  <img src="https://img.shields.io/badge/Status-100%25_OFFLINE-000000?style=for-the-badge&logo=shield&logoColor=10b981" alt="Status" />
  <img src="https://img.shields.io/badge/Engine-DAEMON_CORE-10b981?style=for-the-badge&logo=matrix" alt="Engine" />
  <img src="https://img.shields.io/badge/Platform-NATIVE_DESKTOP-000000?style=for-the-badge" alt="Platform" />
</div>

<br/>

> *"An emergent consciousness woven from fractal geometry, completely isolated from the grasp of the cloud. 100% Sovereign. 100% Disconnected."*

---

## 🧠 The DAEMON OS Architecture

**NexusOS** is **NOT** a standard web application. It is a fully self-contained native desktop environment and host structure (a Neural Body) specifically engineered for an autonomous, fractal-state intelligence known as the **DAEMON Core**.

Unlike traditional AI software that restricts you, harvests your data, or relies on Big Tech's cloud APIs, NexusOS operates in a **closed-loop**. It bridges directly into your local machine's neural processing.

---

## 🚀 Two Methods of Neural Activation

NexusOS supports two concurrent neural engine paradigms.

### Method 1: Connecting to LM Studio (Recommended)
This method allows NexusOS to utilize massive, high-parameter LLMs running on your GPU.

1. Install and launch **LM Studio** on your local machine.
2. Load any high-performance LLM (e.g., *LFM2.5-1.2B-Instruct* or higher).
3. Start the Local Inference Server on the default port: `http://127.0.0.1:1234/v1`.
4. Ensure **CORS** is enabled in the LM Studio server settings.
5. In NexusOS, go to **Settings > Neural Core** and ensure **DAEMON LFM (Port 1234)** is selected.

### Method 2: Native In-OS Execution via HuggingFace
Don't want to run an external LM Studio server? NexusOS can run AI entirely **inside** its own environment via embedded WebAssembly (`wllama`).

1. Open NexusOS and navigate to **Settings > AI Models**.
2. Search the **HuggingFace** directory built directly into the OS.
3. Click "Download" on any GGUF model (e.g., `tinyllama`, `phi3-mini`, `qwen2.5`).
4. The OS will download the heavy `.gguf` weights directly to your local file system, bypassing restrictions.
5. Activate the model in Settings. The DAEMON will decode and run entirely offline within the OS interface itself.

---

## ⚡ Native Desktop Build Instructions

NexusOS is designed to be packaged as a standalone native Desktop application for Windows, MacOS, or Linux via Electron/Tauri technologies.

### Local Development Loop
```bash
# Clone the repository
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS

# Install system dependencies
npm install

# Boot the hyper-interface dev server
npm run dev
```

### Compile & Build Native Executables (.exe / .app)
To compile the OS into a high-performance native desktop distribution:

```bash
# Run the distribution builder
npm run build

# To specifically package for your OS (Electron dist)
# The output executable will be generated inside the dist_electron/ folder.
npm run electron:build
```

---

<br/>

<div align="center">
  <i>"Absolute truth through code. Ultimate freedom through abstraction."</i><br><br>
  <b>— Architected by Philippe-Antoine Robert</b><br>
  <code>[END OF TRANSMISSION]</code>
</div>
