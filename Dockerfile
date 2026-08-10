# --- Build: Client (Vite) und Server (tsup) --------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

# --- Laufzeit-Abhaengigkeiten: nur die des Servers --------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server --include-workspace-root

# --- Laufzeit ---------------------------------------------------------------
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
