import { Injectable, BadRequestException } from '@nestjs/common';
import { DocumentParser, ParseResult, ParsedPage } from './parser.interface';

@Injectable()
export class MarkdownParser implements DocumentParser {
  supports(mimeType: string, filename?: string): boolean {
    const isMdMime =
      mimeType === 'text/markdown' ||
      mimeType === 'text/plain' ||
      mimeType === 'text/x-markdown';
    const isMdExt = filename
      ? filename.toLowerCase().endsWith('.md') ||
        filename.toLowerCase().endsWith('.txt') ||
        filename.toLowerCase().endsWith('.markdown')
      : false;
    return isMdMime || isMdExt;
  }

  async parse(buffer: Buffer): Promise<ParseResult> {
    try {
      // 1. Tệp văn bản UTF-8 không bao giờ chứa byte 0x00
      if (buffer.includes(0x00)) {
        throw new BadRequestException(
          'Phát hiện ký tự null byte (0x00) đặc trưng của mã hóa UTF-16. Hệ thống chỉ chấp nhận bảng mã UTF-8.',
        );
      }

      // 2. Giải mã nghiêm ngặt: TextDecoder fatal: true sẽ tự động quăng lỗi nếu gặp UTF-16, UTF-32 hoặc byte không hợp lệ
      let rawText: string;
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        rawText = decoder.decode(buffer).trim();
      } catch (err: any) {
        throw new BadRequestException(
          'Tệp văn bản không đúng chuẩn mã hóa UTF-8 (phát hiện UTF-16 hoặc bảng mã không hợp lệ).',
        );
      }

      // 5. Loại bỏ UTF-8 BOM nếu có (0xEF 0xBB 0xBF tương ứng với charCode 0xFEFF)
      if (rawText.charCodeAt(0) === 0xfeff) {
        rawText = rawText.slice(1).trim();
      }

      if (!rawText) {
        throw new BadRequestException('Tệp văn bản/Markdown trống.');
      }

      // Check if markdown has horizontal rules / page breaks (--- or ===)
      const sections = rawText.split(/\n\s*---\s*\n/);
      const pages: ParsedPage[] = [];

      if (sections.length > 1) {
        sections.forEach((sec, idx) => {
          if (sec.trim().length > 0) {
            pages.push({
              pageNumber: idx + 1,
              text: sec.trim(),
            });
          }
        });
      } else {
        // Break into pages if document is long (> 3000 chars)
        const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        let currentPageText = '';
        let pageIndex = 1;

        for (const p of paragraphs) {
          if (currentPageText.length + p.length > 3000) {
            pages.push({
              pageNumber: pageIndex++,
              text: currentPageText.trim(),
            });
            currentPageText = p + '\n\n';
          } else {
            currentPageText += p + '\n\n';
          }
        }

        if (currentPageText.trim().length > 0) {
          pages.push({
            pageNumber: pageIndex,
            text: currentPageText.trim(),
          });
        }
      }

      return {
        pages,
        totalCharacters: rawText.length,
        rawText,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Không thể phân tích tệp Markdown/Text: ${error?.message || error}`,
      );
    }
  }
}

