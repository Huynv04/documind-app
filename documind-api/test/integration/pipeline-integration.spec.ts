import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { UserRole, DocumentStatus } from '@prisma/client';
import { IngestionWorker, IngestJobData } from '../../src/modules/jobs/ingestion.worker';
import { RetrievalService } from '../../src/modules/rag/retrieval.service';
import { LlmClientService } from '../../src/modules/rag/llm-client.service';
import { ChatService } from '../../src/modules/chat/chat.service';

describe('Integration Tests: Ingestion Pipeline & SSE Chat Stream (Trụ cột 2 - TestingStrategy.md)', () => {
  describe('1. BullMQ Ingestion Worker Lifecycle & Retry Mechanism', () => {
    let worker: IngestionWorker;
    let mockPrisma: any;
    let mockDocumentService: any;
    let mockChunkingService: any;
    let mockEmbeddingService: any;

    beforeEach(() => {
      mockPrisma = {
        document: {
          update: jest.fn<any>().mockResolvedValue({ id: 'doc-1' }),
        },
        documentChunk: {
          updateMany: jest.fn<any>().mockResolvedValue({ count: 2 }),
        },
        $executeRawUnsafe: jest.fn<any>().mockResolvedValue(1),
      };

      mockDocumentService = {
        parseDocumentContent: jest.fn<any>().mockResolvedValue({
          pages: [
            { pageNumber: 1, text: 'Trang 1 nội dung' },
            { pageNumber: 2, text: 'Trang 2 nội dung' },
          ],
          totalCharacters: 30,
          rawText: 'Trang 1 nội dung\n\nTrang 2 nội dung',
        }),
      };

      mockChunkingService = {
        chunkText: jest.fn<any>().mockImplementation((text: string, pageNum: number) => [
          {
            content: text,
            tokenCount: 15,
            pageNumber: pageNum,
          },
        ]),
      };

      mockEmbeddingService = {
        embedBatch: jest.fn<any>().mockResolvedValue([
          new Array(1536).fill(0.01),
          new Array(1536).fill(0.02),
        ]),
      };

      worker = new IngestionWorker(
        mockPrisma,
        mockDocumentService,
        mockChunkingService,
        mockEmbeddingService,
      );
    });

    it('Xử lý thành công toàn bộ vòng đời Ingestion: UPLOADING -> PROCESSING -> INDEXED', async () => {
      const mockJob: any = {
        id: 'job-101',
        data: {
          documentId: 'doc-101',
          storagePath: 'uploads/file.pdf',
          mimeType: 'application/pdf',
          originalName: 'Quy_trinh_2026.pdf',
        } as IngestJobData,
        attemptsMade: 0,
      };

      const result = await worker.handleIngest(mockJob);

      expect(result.success).toBe(true);
      expect(result.chunksCount).toBe(2);

      // Bước 1: Cập nhật PROCESSING
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-101' },
          data: expect.objectContaining({ status: DocumentStatus.PROCESSING }),
        }),
      );

      // Bước 2: Bóc tách parser được gọi
      expect(mockDocumentService.parseDocumentContent).toHaveBeenCalledWith('doc-101');

      // Bước 3: Lưu trữ chunks vào Postgres pgvector
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);

      // Bước 4: Cập nhật INDEXED
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-101' },
          data: expect.objectContaining({
            status: DocumentStatus.INDEXED,
            pageCount: 2,
          }),
        }),
      );
    });

    it('Xử lý lỗi bóc tách và tự động chuyển sang FAILED khi vượt quá số lần thử', async () => {
      mockDocumentService.parseDocumentContent.mockRejectedValueOnce(
        new Error('PDF bị mã hóa mật khẩu, không thể đọc.'),
      );

      const mockFailedJob: any = {
        id: 'job-err',
        data: {
          documentId: 'doc-err',
          storagePath: 'uploads/encrypt.pdf',
          mimeType: 'application/pdf',
          originalName: 'encrypt.pdf',
        },
        attemptsMade: 2,
      };

      await expect(worker.handleIngest(mockFailedJob)).rejects.toThrow(
        'PDF bị mã hóa mật khẩu, không thể đọc.',
      );

      // Phải cập nhật FAILED kèm errorMessage chi tiết
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-err' },
          data: expect.objectContaining({
            status: DocumentStatus.FAILED,
            errorMessage: 'PDF bị mã hóa mật khẩu, không thể đọc.',
            retryCount: 3,
          }),
        }),
      );
    });
  });

  describe('2. Real-time SSE Chat Stream & Source Attribution', () => {
    let chatService: ChatService;
    let mockPrisma: any;
    let mockRetrieval: any;
    let mockRewriter: any;
    let mockLlm: any;

    beforeEach(() => {
      mockPrisma = {
        chatSession: {
          findUnique: jest.fn<any>().mockResolvedValue({ id: 'sess-1', userId: 'user-1' }),
          create: jest.fn<any>().mockResolvedValue({ id: 'sess-new', title: 'Hỏi đáp SOP' }),
          update: jest.fn<any>().mockResolvedValue({ id: 'sess-1' }),
        },
        chatMessage: {
          findMany: jest.fn<any>().mockResolvedValue([]),
          create: jest.fn<any>().mockResolvedValue({ id: 'msg-saved' }),
        },
        document: {
          findMany: jest.fn<any>().mockResolvedValue([
            { id: 'doc-hr', originalName: 'Quy_che_WFH_2026.pdf', mimeType: 'application/pdf' },
          ]),
        },
        auditLog: {
          create: jest.fn<any>().mockResolvedValue({ id: 'audit-1' }),
        },
      };

      mockRetrieval = {
        retrieve: jest.fn<any>().mockResolvedValue([
          {
            chunkId: 'chunk-1',
            documentId: 'doc-hr',
            content: 'Nhân viên được làm việc từ xa tối đa 2 ngày/tuần.',
            pageNumber: 3,
            score: 0.94,
          },
        ]),
      };

      mockRewriter = {
        rewrite: jest.fn<any>().mockResolvedValue('Quy định làm việc từ xa 2026?'),
      };

      mockLlm = {
        generateAnswerStream: async function* () {
          yield { type: 'token', content: 'Nhân viên ' };
          yield { type: 'token', content: 'được làm việc từ xa 2 ngày/tuần.' };
          yield {
            type: 'sources',
            data: {
              sources: [
                {
                  documentId: 'doc-hr',
                  pageNumber: 3,
                  chunkId: 'chunk-1',
                  relevanceScore: 0.94,
                },
              ],
              confidence: 'high',
            },
          };
        },
      };

      chatService = new ChatService(
        mockPrisma,
        mockRewriter,
        mockRetrieval,
        mockLlm,
      );
    });

    it('Stream đầy đủ các sự kiện SSE: rewritten query, tokens, sources trích dẫn và kết thúc [DONE]', async () => {
      const user = {
        id: 'user-1',
        role: UserRole.EMPLOYEE,
        departmentId: 'dept-hr',
      };

      const mockRes: any = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        flushHeaders: jest.fn(),
      };

      await chatService.streamQuery(
        { question: 'Tôi được WFH mấy ngày?' },
        user,
        mockRes,
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8');
      expect(mockRes.write).toHaveBeenCalled();

      const writes = mockRes.write.mock.calls.map((c: any) => c[0]);
      expect(writes.some((w: string) => w.includes('"type":"meta"'))).toBe(true);
      expect(writes.some((w: string) => w.includes('"type":"token"'))).toBe(true);
      expect(writes.some((w: string) => w.includes('"type":"sources"'))).toBe(true);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
