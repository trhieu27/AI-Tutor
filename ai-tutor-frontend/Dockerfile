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
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
