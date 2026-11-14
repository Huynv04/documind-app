-- Migration: 001_init_pgvector
-- Kích hoạt extension pgvector và tạo cột embedding cho document_chunks

-- 1. Kích hoạt extension (cần pgvector đã cài vào Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Thêm cột embedding vào document_chunks (1536 dimensions cho text-embedding-3-small)
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Tạo chỉ mục HNSW để tối ưu tốc độ similarity search
--    ef_construction=200 và m=16 là giá trị cân bằng tốt giữa tốc độ và độ chính xác
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- 4. Tạo chỉ mục GIN để hỗ trợ Full-Text Search (Hybrid Search)
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_chunks_content_fts
ON document_chunks USING gin(content_tsv);

-- 5. Index hỗ trợ filter theo document_id và is_active (tự động nhận diện camelCase/snake_case)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'documentId') THEN
    CREATE INDEX IF NOT EXISTS idx_chunks_document_active ON document_chunks ("documentId", "isActive");
  ELSE
    CREATE INDEX IF NOT EXISTS idx_chunks_document_active ON document_chunks (document_id, is_active);
  END IF;
END $$;

