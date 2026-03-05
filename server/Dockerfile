# Use lightweight Node image
FROM node:20-alpine

# Create app directory
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*


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