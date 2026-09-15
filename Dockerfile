FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data UPLOAD_DIR=/app/public/uploads
COPY --from=build /app ./
VOLUME ["/app/data", "/app/public/uploads"]
EXPOSE 3000
CMD ["node", "server.js"]
