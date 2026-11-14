import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { DocumentParser, ParseResult } from './parsers/parser.interface';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { DocumentStatus, SensitivityLevel, UserRole } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/markdown',
  'text/plain',
  'text/x-markdown',
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly parsers: DocumentParser[];

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private pdfParser: PdfParser,
    private docxParser: DocxParser,
    private markdownParser: MarkdownParser,
    @Optional()
    @InjectQueue('ingestion')
    private ingestionQueue?: Queue,
  ) {
    this.parsers = [this.pdfParser, this.docxParser, this.markdownParser];
  }

  /**
   * 1. Xử lý tải lên và đăng ký tài liệu vào hệ thống (Upload & Register)
   */
  async uploadDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    user: { id: string; role: UserRole; departmentId?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin cần tải lên');
    }

    // 1. Kiểm tra dung lượng
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Dung lượng tệp vượt quá giới hạn tối đa cho phép (20MB)');
    }

    // 2. Kiểm tra định dạng MIME
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const hasValidExt = /\.(pdf|docx|doc|md|txt)$/i.test(file.originalname);

    if (!isValidMime && !hasValidExt) {
      throw new BadRequestException(
        `Định dạng tệp không được hỗ trợ (${file.mimetype}). Chỉ chấp nhận PDF, DOCX, TXT, Markdown.`,
      );
    }

    // 2.1 Kiểm tra bảng mã đối với tệp văn bản (TXT, Markdown) theo quy chuẩn Mục 6 Nghiệp vụ
    const isTextFile =
      file.mimetype === 'text/plain' ||
      file.mimetype === 'text/markdown' ||
      file.mimetype === 'text/x-markdown' ||
      /\.(txt|md|markdown)$/i.test(file.originalname);

    if (isTextFile) {
      this.validateTextFileEncoding(file.buffer);
    }

    // 3. Lưu trữ tệp vào Storage (Local hoặc MinIO/S3)
    const storagePath = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 4. Ước tính số trang ban đầu bằng Parser tương ứng
    let estimatedPageCount: number | null = null;
    try {
      const parser = this.getParser(file.mimetype, file.originalname);
      if (parser) {
        const parsed = await parser.parse(file.buffer);
        estimatedPageCount = parsed.pages.length;
      }
    } catch (err: any) {
      this.logger.warn(`Preliminary parsing failed: ${err?.message}. Will proceed to ingestion.`);
    }

    // 5. Lưu thông tin tài liệu vào PostgreSQL qua Prisma
    const defaultAllowedRoles: UserRole[] = [
      UserRole.EMPLOYEE,
      UserRole.KNOWLEDGE_MANAGER,
      UserRole.ADMIN,
    ];

    const document = await this.prisma.document.create({
      data: {
        originalName: file.originalname,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: DocumentStatus.UPLOADING,
        sensitivity: dto.sensitivity || SensitivityLevel.INTERNAL,
        allowedRoles: dto.allowedRoles && dto.allowedRoles.length > 0
          ? dto.allowedRoles
          : defaultAllowedRoles,
        departmentId: dto.departmentId || user.departmentId || null,
        uploadedById: user.id,
        pageCount: estimatedPageCount,
      },
      include: {
        department: true,
        tags: true,
      },
    });

    // 6. Xử lý gắn Tags nếu có
    if (dto.tags && dto.tags.length > 0) {
      for (const tag of dto.tags) {
        const trimmed = tag.trim();
        if (trimmed) {
          await this.prisma.documentTag.create({
            data: {
              documentId: document.id,
              tag: trimmed,
            },
          });
        }
      }
    }

    // 7. Đưa tác vụ vào hàng đợi BullMQ để Ingestion Worker (Module 3) bóc tách và embed ngầm
    if (this.ingestionQueue) {
      try {
        await this.ingestionQueue.add(
          'ingest-document',
          {
            documentId: document.id,
            storagePath: document.storagePath,
            mimeType: document.mimeType,
            originalName: document.originalName,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
          },
        );

        // Chuyển trạng thái sang PROCESSING
        await this.prisma.document.update({
          where: { id: document.id },
          data: { status: DocumentStatus.PROCESSING },
        });
      } catch (err: any) {
        this.logger.error(`Failed to push job to BullMQ queue: ${err?.message}`);
      }
    }

    return this.findOne(document.id, user);
  }

  /**
   * 2. Lấy danh sách tài liệu có phân trang, tìm kiếm và RBAC Filter
   */
  async findAll(query: QueryDocumentDto, user: { id: string; role: UserRole; departmentId?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      status: { not: DocumentStatus.DELETED },
    };

    // Áp dụng RBAC: Người dùng chỉ được xem tài liệu nếu vai trò nằm trong allowedRoles
    if (user.role !== UserRole.ADMIN) {
      where.allowedRoles = {
        has: user.role,
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.sensitivity) {
      where.sensitivity = query.sensitivity;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.search) {
      where.originalName = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
          tags: true,
          _count: {
            select: { chunks: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 3. Xem chi tiết một tài liệu
   */
  async findOne(id: string, user: { id: string; role: UserRole }) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        tags: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!document || document.status === DocumentStatus.DELETED) {
      throw new NotFoundException(`Không tìm thấy tài liệu với ID: ${id}`);
    }

    // Kiểm tra quyền đọc tài liệu theo RBAC
    if (user.role !== UserRole.ADMIN && !document.allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài liệu này');
    }

    return document;
  }

  /**
   * 4. Tải xuống tệp tin gốc
   */
  async downloadFile(id: string, user: { id: string; role: UserRole }) {
    const document = await this.findOne(id, user);
    const buffer = await this.storageService.getFileBuffer(document.storagePath);

    return {
      buffer,
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  /**
   * 5. Xóa tài liệu (Gán cờ DELETED và dọn dẹp lưu trữ)
   */
  async delete(id: string, user: { id: string; role: UserRole }) {
    const document = await this.findOne(id, user);

    // Chỉ ADMIN, KNOWLEDGE_MANAGER hoặc người tải lên mới có quyền xóa
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.KNOWLEDGE_MANAGER &&
      document.uploadedById !== user.id
    ) {
      throw new ForbiddenException('Bạn không có quyền xóa tài liệu này');
    }

    // Cập nhật trạng thái thành DELETED
    await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.DELETED },
    });

    // Xóa tệp vật lý khỏi storage
    await this.storageService.deleteFile(document.storagePath);

    return {
      success: true,
      message: `Tài liệu "${document.originalName}" đã được xóa thành công`,
    };
  }

  /**
   * 6. Hàm phân tích tệp tin bằng Parser chuyên biệt (Dành cho Worker & Pipeline)
   */
  async parseDocumentContent(documentId: string): Promise<ParseResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Không tìm thấy tài liệu ID ${documentId}`);
    }

    const buffer = await this.storageService.getFileBuffer(document.storagePath);
    const parser = this.getParser(document.mimeType, document.originalName);

    if (!parser) {
      throw new BadRequestException(
        `Không tìm thấy bộ phân tích (Parser) phù hợp cho định dạng: ${document.mimeType}`,
      );
    }

    return parser.parse(buffer);
  }

  /**
   * 7. Lấy danh sách các Chunks của tài liệu (Kiểm tra kết quả bóc tách của Module 3)
   */
  async getDocumentChunks(id: string, user: { id: string; role: UserRole }) {
    await this.findOne(id, user);

    return this.prisma.documentChunk.findMany({
      where: { documentId: id, isActive: true },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        pageNumber: true,
        tokenCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * 8. Kích hoạt thử lại (Retry) nạp tài liệu thất bại vào hàng đợi BullMQ
   */
  async retryIngestion(id: string, user: { id: string; role: UserRole }) {
    const document = await this.findOne(id, user);

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.KNOWLEDGE_MANAGER) {
      throw new ForbiddenException('Bạn không có quyền kích hoạt xử lý lại tài liệu này');
    }

    if (!this.ingestionQueue) {
      throw new BadRequestException('Hàng đợi xử lý ngầm (BullMQ) chưa sẵn sàng');
    }

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PROCESSING,
        errorMessage: null,
      },
    });

    await this.ingestionQueue.add(
      'ingest-document',
      {
        documentId: document.id,
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        originalName: document.originalName,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    return {
      success: true,
      message: `Đã đưa tài liệu "${document.originalName}" vào lại hàng đợi xử lý ngầm`,
    };
  }

  /**
   * Lựa chọn parser phù hợp dựa theo MIME type hoặc tên file
   */
  private getParser(mimeType: string, filename?: string): DocumentParser | undefined {
    return this.parsers.find((p) => p.supports(mimeType, filename));
  }

  /**
   * Kiểm tra định dạng mã hóa ký tự (Encoding) cho các tệp văn bản (TXT, Markdown).
   * Tối giản & chuẩn xác nhất: Chỉ chấp nhận bảng mã UTF-8 nhằm tránh lỗi ký tự tiếng Việt.
   */
  public validateTextFileEncoding(buffer: Buffer): void {
    if (!buffer || buffer.length === 0) return;

    // 1. Tệp văn bản UTF-8 không bao giờ chứa byte null 0x00 (dấu hiệu của UTF-16 hoặc nhị phân)
    if (buffer.includes(0x00)) {
      throw new BadRequestException(
        'Phát hiện ký tự null byte (0x00) đặc trưng của mã hóa UTF-16. Hệ thống chỉ chấp nhận tệp văn bản chuẩn UTF-8.',
      );
    }

    // 2. TextDecoder({ fatal: true }) tự động ném lỗi nếu gặp byte sai chuẩn UTF-8 (UTF-16 BE, LE, UTF-32, ANSI...)
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new BadRequestException(
        'Tệp văn bản không đúng chuẩn mã hóa UTF-8 (phát hiện UTF-16 hoặc bảng mã không hợp lệ). Hệ thống chỉ chấp nhận bảng mã UTF-8 để bảo toàn ký tự tiếng Việt.',
      );
    }
  }
}

