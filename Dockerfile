# Stage 1: Build
FROM node:24-alpine AS builder

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
FROM node:24-alpine

WORKDIR /usr/src/app

# Kopiuj package files
COPY package*.json ./

# Zainstaluj tylko production dependencies
RUN npm ci --omit=dev

# Kopiuj zbudowane pliki z poprzedniego stage'a
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8080

# Uruchom bezpośrednio zbudowany plik (bez rebuildu)
CMD ["node", "dist/server.js"]