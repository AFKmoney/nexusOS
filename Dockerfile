# ─── NexusOS Dockerfile — Optimized for hosted demo ──────────────────
# Builds a production Vite bundle served by nginx. The demo boots in
# < 2 seconds (no Node.js runtime — just static files + nginx).
#
# Build:  docker build -t nexusos-demo .
# Run:    docker run -p 8080:80 nexusos-demo
# Visit:  http://localhost:8080

# ─── Stage 1: Build ──────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev 2>/dev/null || npm install

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ──────────────────────────────────────────────────
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy landing page
COPY download/landing.html /usr/share/nginx/html/landing.html

# Custom nginx config: SPA routing + gzip + cache headers
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 256;

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Landing page
    location = /landing {
        try_files /landing.html =404;
    }

    # Disable favicon logging
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        return 204;
    }
}
NGINX

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
