# Use lightweight Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

RUN apk update && apk add --no-cache python3 build-base


# Install dependencies first (better caching)
COPY package*.json ./

RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for sqlite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]