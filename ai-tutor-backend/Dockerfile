FROM node:20-alpine

# LibreOffice headless for DOCX → PDF conversion (accurate page numbers)
RUN apk add --no-cache libreoffice-writer font-noto

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p ./storage/uploads

EXPOSE 8081

CMD ["node", "src/server.js"]
