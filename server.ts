import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // General Web Proxy for WebRunner (bypasses CORS & X-Frame-Options)
  app.get("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("Missing 'url' parameter.");
      }

      let finalUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = "https://" + finalUrl;
      }

      console.log(`[Proxy] Fetching target: ${finalUrl}`);

      const response = await fetch(finalUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        },
      });

      const contentType = response.headers.get("content-type") || "text/html";
      res.setHeader("Content-Type", contentType);

      // Disable X-Frame-Options and Content-Security-Policy to allow loading in iframes safely
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/json") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/javascript") &&
        !contentType.includes("text/css")
      ) {
        // Binary stream (images, favicon, audio, video, etc.)
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }

      const text = await response.text();
      res.send(text);
    } catch (err: any) {
      console.error("[Proxy] error:", err);
      res.status(500).send(`Proxy failed to fetch the target URL: ${err.message}`);
    }
  });

  // Wildcard path-based proxy for resolving relative web resources correctly
  app.get("/api/proxy/:protocol/:host/*", async (req, res) => {
    try {
      const { protocol, host } = req.params;
      const params = req.params as unknown as Record<string, string>;
      const pathSuffix = params['0'] || "";
      const queryStr = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";

      // Reconstruct target URL
      const finalUrl = `${protocol}://${host}/${pathSuffix}${queryStr}`;

      console.log(`[Path-Proxy] Fetching: ${finalUrl}`);

      const response = await fetch(finalUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        },
      });

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);

      // Disable security headers that prevent iframe loads
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/json") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/javascript") &&
        !contentType.includes("text/css")
      ) {
        // Binary stream
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }

      const text = await response.text();
      res.send(text);
    } catch (err: any) {
      console.error("[Path-Proxy] error:", err);
      res.status(500).send(`Path Proxy failed to fetch: ${err.message}`);
    }
  });

  // Proxy for Gemini API
  app.post("/api/gemini/models/:modelId", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: { message: "GEMINI_API_KEY not configured on server" } });
      }
      
      const endpoint = req.params.modelId.split(':')[1];
      const modelId = req.params.modelId.split(':')[0];
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${endpoint}?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      
      res.status(response.status);
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }
      
      if (response.body) {
        // use node-fetch readable stream interop or native WebStream reader
        // since Node 18 fetch returns WebStream
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error("[GEMINI] Proxy Error:", err);
      res.status(500).json({ error: { message: err.message } });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
