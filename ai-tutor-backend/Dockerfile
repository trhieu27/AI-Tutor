FROM node:20-alpine

# LibreOffice headless for DOCX → PDF conversion (accurate page numbers)
# font-liberation: metrically compatible with Times New Roman, Arial, Courier New
# font-noto: fallback for Vietnamese and Unicode characters
RUN apk add --no-cache libreoffice-writer font-noto font-liberation fontconfig \
    && fc-cache -f

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p ./storage/uploads

EXPOSE 8081

CMD ["node", "src/server.js"]
