FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN mkdir -p /app/data

EXPOSE 4001

CMD ["node", "dist/index.js"]