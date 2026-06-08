require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '8081'),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  databaseName: process.env.DATABASE_NAME || 'ai_tutor',

  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
  accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '60'),
  refreshTokenExpireDays: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7'),

  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // ChromaDB
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromName: process.env.EMAILS_FROM_NAME || 'AI Tutor Support',
  },

  uploadDir: process.env.UPLOAD_DIR || './storage/uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25'),

  // AWS S3
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_S3_REGION || 'ap-southeast-1',
  },

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim()),

  freeLimits: {
    documents: 10,
    chatMessages: 30,
    aiFeatures: 10,
    contextMessages: 6,
    questionChars: 1200,
    msgChars: 800,
  },
};
