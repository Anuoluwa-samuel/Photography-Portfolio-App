FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data UPLOAD_DIR=/app/public/uploads
VOLUME ["/app/data", "/app/public/uploads"]
EXPOSE 3000
CMD ["node", "server.js"]
