# ProconBot Jacareí — Node + Chromium para whatsapp-web.js (Puppeteer)
# Build a partir da raiz do repositório:
#   docker build -f docker/Dockerfile .

# -----------------------------------------------------------------------------
# Etapa 1: compila TypeScript (inclui devDependencies: typescript, etc.)
# -----------------------------------------------------------------------------
FROM node:22.22.2-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Etapa 2: runtime — só dependências de produção + Chromium do sistema
# -----------------------------------------------------------------------------
FROM node:22.22.2-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxss1 \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_DISABLE_HEADLESS_WARNING=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs/knowledge ./docs/knowledge

RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache \
    && chown -R node:node /app

ENV NODE_ENV=production

USER node

CMD ["npm", "start"]
