# DSL Server Dockerfile
FROM node:20-alpine

# Tools needed by generated scripts and healthchecks
RUN apk add --no-cache bash curl jq

WORKDIR /app

# Install deps first for layer caching
COPY package.json ./
RUN npm install --production

# Copy source
COPY . .

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "src/server/index.js"]
