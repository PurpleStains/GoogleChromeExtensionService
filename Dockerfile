# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Kopiuj pliki package
COPY package*.json ./
COPY tsconfig.json ./

# Zainstaluj wszystkie zależności (włącznie z devDependencies dla TypeScript)
RUN npm ci

# Kopiuj kod źródłowy
COPY . .

# Zbuduj projekt TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Kopiuj package files
COPY package*.json ./

# Zainstaluj tylko production dependencies
RUN npm ci --omit=dev

# Kopiuj zbudowane pliki z poprzedniego stage'a
COPY --from=builder /usr/src/app/dist ./dist

# Zmienne środowiskowe
# ENV NODE_ENV=production \
#     PORT=8080 \
#     GC_PROJECT_ID=peaksellchromeextension \
#     SERVICE_API_URL_PROD=https://catalog-api-163413146123.us-central1.run.app \
#     FIRESTORE_DATABASE=nip-catalogs

EXPOSE 8080

# Uruchom bezpośrednio zbudowany plik (bez rebuildu)
CMD ["node", "dist/server.js"]