# DSL Server Dockerfile
FROM node:20-bookworm-slim

# Tools needed by generated scripts and healthchecks
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash curl jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for layer caching
COPY package.json ./
RUN npm install --production

# Copy source
COPY . .

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "src/server/index.js"]
