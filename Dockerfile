# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libx11-dev \
    libxcomposite-dev \
    libxcursor-dev \
    libxdamage-dev \
    libxext-dev \
    libxfixes-dev \
    libxi-dev \
    libxrandr-dev \
    libxrender-dev \
    libxss-dev \
    libxtst-dev \
    libcups2-dev \
    libgtk-3-dev \
    libnss3-dev \
    libasound2-dev \
    libgbm-dev \
    libdrm-dev \
    libxkbcommon-dev \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libx11-dev \
    libxcomposite-dev \
    libxcursor-dev \
    libxdamage-dev \
    libxext-dev \
    libxfixes-dev \
    libxi-dev \
    libxrandr-dev \
    libxrender-dev \
    libxss-dev \
    libxtst-dev \
    libcups2-dev \
    libgtk-3-dev \
    libnss3-dev \
    libasound2-dev \
    libgbm-dev \
    libdrm-dev \
    libxkbcommon-dev \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

CMD ["node", "-e", "console.log('NexusOS container image built successfully. Electron desktop runtime is not started in Docker.')"]