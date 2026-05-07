FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p ./storage/uploads

EXPOSE 8081

CMD ["node", "src/server.js"]
