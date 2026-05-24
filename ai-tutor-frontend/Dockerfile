# ============================================================
# Stage 1: Build Vite app
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

# Build-time env vars (truyền từ docker-compose args)
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ============================================================
# Stage 2: Serve với nginx (nhẹ, nhanh)
# ============================================================
FROM nginx:alpine AS runner

# Copy static build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Config nginx để handle React Router (SPA fallback)
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    # Fix .mjs MIME type for PDF.js worker\n\
    types {\n\
        application/javascript mjs js;\n\
        text/css css;\n\
        text/html html htm;\n\
        application/json json;\n\
        image/svg+xml svg;\n\
        image/png png;\n\
        image/jpeg jpg jpeg;\n\
        font/woff2 woff2;\n\
        font/woff woff;\n\
        application/octet-stream bin;\n\
    }\n\
    \n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    location ~* \\.(js|mjs|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {\n\
        expires 30d;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    \n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
