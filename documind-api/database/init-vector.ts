import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang cấu hình pgvector cho Docker Database...');

  // 1. Kích hoạt extension pgvector
  console.log('1. Kích hoạt extension vector...');
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

  // 2. Thêm cột embedding vào document_chunks
  console.log('2. Thêm cột embedding vector(1536)...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536);
  `);

  // 3. Tạo chỉ mục HNSW
  console.log('3. Tạo chỉ mục HNSW cho vector similarity search...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
  `);

  // 4. Thêm cột content_tsv cho Full-text search
  console.log('4. Thêm cột content_tsv cho Full-Text Search...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  `);

  // 5. Tạo chỉ mục GIN
  console.log('5. Tạo chỉ mục GIN cho FTS...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_chunks_content_fts
    ON document_chunks USING gin(content_tsv);
  `);

  // 6. Tạo index documentId & isActive
  console.log('6. Tạo index lọc documentId và isActive...');
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'documentId') THEN
        CREATE INDEX IF NOT EXISTS idx_chunks_document_active ON document_chunks ("documentId", "isActive");
      ELSE
        CREATE INDEX IF NOT EXISTS idx_chunks_document_active ON document_chunks (document_id, is_active);
      END IF;
    END $$;
  `);

  console.log('✅ Khởi tạo pgvector thành công 100%! Không cần dùng pgAdmin.');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khởi tạo pgvector:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
