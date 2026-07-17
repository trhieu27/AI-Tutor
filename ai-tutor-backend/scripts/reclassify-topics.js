#!/usr/bin/env node
/**
 * Reclassify topics for all READY documents using the new normalization logic.
 * Run inside Docker: docker exec ai_tutor_backend node scripts/reclassify-topics.js
 */

const config = require('../src/config');
const { connectDB } = require('../src/db/mongoose');
const { Document } = require('../src/db/models');
const { generateText } = require('../src/rag/gemini');

const DELAY_MS = 1500; // delay between documents to avoid rate limiting

async function classifyOne(doc, existingTopics) {
  let name = (doc.file_name || '').replace(/\.[^.]+$/, '');
  try { name = decodeURIComponent(name); } catch (e) { /* ignore */ }
  name = name.replace(/[_-]/g, ' ').replace(/%20/g, ' ').replace(/\s+/g, ' ').trim();

  // Gather context
  let context = '';
  if (doc.summary) {
    context = doc.summary.slice(0, 500);
  }
  if (!context && doc.chroma_collection_id) {
    try {
      const vectorstore = require('../src/rag/vectorstore');
      const allDocs = await vectorstore.getAllDocuments(doc.chroma_collection_id);
      if (allDocs?.length) {
        const indices = [
          0,
          Math.floor(allDocs.length * 0.25),
          Math.floor(allDocs.length * 0.5),
          Math.floor(allDocs.length * 0.75),
          allDocs.length - 1,
        ];
        const unique = [...new Set(indices)].filter(i => i >= 0 && i < allDocs.length);
        context = unique.map(i => allDocs[i]).join('\n').slice(0, 800);
      }
    } catch (e) { /* ignore */ }
  }

  const input = [
    name ? `Tên file: "${name}"` : '',
    context ? `Nội dung: ${context}` : '',
  ].filter(Boolean).join('\n');

  if (!input) return null;

  // Step 1: Classify
  const rawResult = await generateText(
    `Phân loại tài liệu học thuật này vào MỘT chủ đề ngắn gọn (2-5 từ, tiếng Việt hoặc thuật ngữ gốc nếu phổ biến hơn). Chỉ trả về tên chủ đề, không giải thích.\n\n${input}`,
    { temperature: 0.1, maxTokens: 30, modelTier: 'lite' }
  );
  const rawTopic = rawResult.trim().replace(/^["']+|["']+$/g, '').replace(/^chủ đề:\s*/i, '').slice(0, 50);
  if (!rawTopic) return null;

  // Step 2: Normalize
  let finalTopic = rawTopic;
  if (existingTopics.length > 0) {
    const normalizeResult = await generateText(
      `Nhiệm vụ: kiểm tra chủ đề mới có THUỘC CÙNG LĨNH VỰC/MÔN HỌC với chủ đề nào đã có không.

Chủ đề mới: "${rawTopic}"
Danh sách chủ đề đã có: ${existingTopics.map(t => `"${t}"`).join(', ')}

Quy tắc:
- Nếu chủ đề mới là NHÁNH CON, CHUYÊN ĐỀ, hoặc CÙNG MÔN HỌC với một chủ đề đã có → trả về CHÍNH XÁC tên chủ đề đã có đó
  Ví dụ: "Hồi quy tuyến tính" thuộc "Học máy", "KNN" thuộc "Trí tuệ nhân tạo", "UML" thuộc "Phân tích thiết kế hướng đối tượng"
- Nếu chủ đề mới TRÙNG NGHĨA (dù khác ngôn ngữ, viết tắt) với chủ đề đã có → trả về CHÍNH XÁC tên chủ đề đã có đó
- Nếu KHÔNG liên quan đến bất kỳ chủ đề nào → trả về CHÍNH XÁC "${rawTopic}"
- Chỉ trả về tên chủ đề, không giải thích`,
      { temperature: 0, maxTokens: 50, modelTier: 'lite' }
    );
    const normalized = normalizeResult.trim().replace(/^["']+|["']+$/g, '').slice(0, 50);
    if (normalized) finalTopic = normalized;
  }

  return { rawTopic, finalTopic };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 Reclassify topics for all READY documents');
  console.log('═'.repeat(60));

  // Connect to MongoDB
  await connectDB();

  // Get all READY documents
  const docs = await Document.find({ status: 'READY' })
    .select('id file_name summary chroma_collection_id topic')
    .sort({ uploaded_at: -1 })
    .lean();

  console.log(`📄 Found ${docs.length} READY documents\n`);

  if (docs.length === 0) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Clear all existing topics first
  await Document.updateMany({ status: 'READY' }, { $set: { topic: null } });
  console.log('🗑️  Cleared all existing topics\n');

  let success = 0;
  let failed = 0;
  const topicsCollected = []; // grows as we classify

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const label = `[${i + 1}/${docs.length}] ${doc.file_name}`;

    try {
      const result = await classifyOne(doc, topicsCollected);
      if (!result) {
        console.log(`⏭️  ${label} — skipped (no context)`);
        continue;
      }

      await Document.updateOne({ id: doc.id }, { $set: { topic: result.finalTopic } });

      // Add to collected topics (avoid duplicates)
      if (!topicsCollected.includes(result.finalTopic)) {
        topicsCollected.push(result.finalTopic);
      }

      if (result.finalTopic !== result.rawTopic) {
        console.log(`✅ ${label}`);
        console.log(`   "${result.rawTopic}" → normalized to "${result.finalTopic}"`);
      } else {
        console.log(`✅ ${label} → "${result.finalTopic}"`);
      }
      success++;
    } catch (err) {
      console.error(`❌ ${label} — ${err.message}`);
      failed++;
    }

    // Rate limit
    if (i < docs.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`🎯 Done: ${success} classified, ${failed} failed`);
  console.log(`📋 Topics: ${topicsCollected.map(t => `"${t}"`).join(', ')}`);
  console.log('═'.repeat(60));

  const mongoose = require('mongoose');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
