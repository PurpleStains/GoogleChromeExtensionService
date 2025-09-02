FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production \
    PORT=8080 \
    GC_PROJECT_ID=peaksellchromeextension \
    FIRESTORE_DATABASE=nip-catalogs

EXPOSE 8080
CMD ["npm", "start"]
