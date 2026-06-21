/**
 * Re-classify all READY documents' topics using improved classifier
 * (content-based, not just file name).
 * 
 * Usage: node scripts/reclassify-topics.js
 */
require('dotenv').config();
const { connectDB } = require('../src/db/mongoose');
const { Document } = require('../src/db/models');
const { generateText } = require('../src/rag/gemini');
const vectorstore = require('../src/rag/vectorstore');

async function classifyDoc(doc) {
  // 1. Clean file name
  let name = (doc.file_name || '').replace(/\.[^.]+$/, '');
  try { name = decodeURIComponent(name); } catch (e) {}
  name = name.replace(/[_-]/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim();

  // 2. Get content context
  let context = '';
  if (doc.summary) {
    context = doc.summary.slice(0, 400);
  } else if (doc.chroma_collection_id) {
    try {
      const allDocs = await vectorstore.getAllDocuments(doc.chroma_collection_id);
      if (allDocs?.length) {
        context = allDocs.slice(0, 3).join(' ').slice(0, 500);
      }
    } catch (e) {}
  }

  const input = [
    name ? `Tên file: "${name}"` : '',
    context ? `Nội dung: ${context}` : '',
  ].filter(Boolean).join('\n');

  if (!input) return null;

  const result = await generateText(
    `Phân loại tài liệu học thuật này vào MỘT chủ đề ngắn gọn (2-5 từ, tiếng Việt hoặc thuật ngữ gốc nếu phổ biến hơn). Chỉ trả về tên chủ đề, không giải thích.\n\n${input}`,
    { temperature: 0.1, maxTokens: 30, modelTier: 'lite' }
  );
  return result.trim().replace(/^["']+|["']+$/g, '').replace(/^chủ đề:\s*/i, '').slice(0, 50) || null;
}

async function main() {
  await connectDB();
  
  const docs = await Document.find({ status: 'READY' })
    .select('id file_name summary chroma_collection_id topic')
    .lean();

  console.log(`Found ${docs.length} READY documents to re-classify\n`);

  let updated = 0;
  for (const doc of docs) {
    const oldTopic = doc.topic || '(none)';
    try {
      const newTopic = await classifyDoc(doc);
      if (newTopic && newTopic !== doc.topic) {
        await Document.updateOne({ id: doc.id }, { $set: { topic: newTopic } });
        console.log(`✓ ${doc.file_name}`);
        console.log(`  ${oldTopic} → ${newTopic}\n`);
        updated++;
      } else {
        console.log(`– ${doc.file_name}: kept "${oldTopic}"`);
      }
    } catch (err) {
      console.error(`✗ ${doc.file_name}: ${err.message}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone. Updated ${updated}/${docs.length} documents.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
