const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// text-embedding-004 requires v1beta (passed as 2nd arg to getGenerativeModel)
// Using gemini-embedding-001 = same model as old Python service (GoogleGenerativeAIEmbeddings)
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const EMBED_MODEL = 'models/gemini-embedding-001';
const CHAT_MODEL = 'gemini-flash-latest'; // Python cũ dùng gemini-flash-latest = alias của gemini-2.0-flash

// ── Embeddings ────────────────────────────────────────────────────────────────

/**
 * Embed a batch of texts.
 * Returns float32 array[] (one per text).
 * Batches internally to stay within API limits.
 */
async function embedTexts(texts) {
  // gemini-embedding-001 requires apiVersion:'v1beta'
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL }, { apiVersion: 'v1beta' });
  const BATCH = 20; // max per request
  const all = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(t => model.embedContent(t))
    );
    results.forEach(r => all.push(r.embedding.values));
  }

  return all;
}

/**
 * Embed a single query string.
 */
async function embedQuery(text) {
  const [vec] = await embedTexts([text]);
  return vec;
}

// ── Text generation ───────────────────────────────────────────────────────────

/**
 * Generate text (non-streaming).
 */
async function generateText(prompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Async generator that yields text chunks from Gemini streaming.
 */
async function* generateStream(prompt, { temperature = 0.3, maxTokens = 8192 } = {}) {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  try {
    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      try {
        const text = chunk.text();
        if (text) yield text;
      } catch (chunkErr) {
        // Skip malformed chunks (e.g. safety filter fragments)
        console.warn('[generateStream] skipping chunk:', chunkErr.message);
      }
    }
  } catch (err) {
    // Re-throw so callers (chat.js routes) can handle 429 / RESOURCE_EXHAUSTED
    throw err;
  }
}

module.exports = { embedTexts, embedQuery, generateText, generateStream };
