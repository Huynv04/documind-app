import { describe, it, expect, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { MarkdownParser } from './parsers/markdown.parser';
import { DocumentService } from './document.service';

describe('Document Encoding & Parser Test (UC-2.2 & Mục 6 Nghiệp vụ)', () => {
  let markdownParser: MarkdownParser;
  let documentService: DocumentService;

  beforeEach(() => {
    markdownParser = new MarkdownParser();
    // Instantiate DocumentService with dummy dependencies for unit testing validateTextFileEncoding
    documentService = new DocumentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      markdownParser,
      undefined,
    );
  });

  const sampleVietnameseText = `Kiểm tra lỗi bảng mã (Encoding Test)
Đây là nội dung tiếng Việt có dấu dùng để kiểm tra bộ lọc UTF-8.
Các ký tự đặc biệt: ă, â, đ, ê, ô, ơ, ư, á, à, ả, ã, ạ.
Dòng 1: Hệ thống xử lý dữ liệu và kiểm thử định dạng tệp tin.
Dòng 2: Cảnh báo nếu tệp không sử dụng chuẩn UTF-8.`;

  describe('MarkdownParser UTF-8 Validation', () => {
    it('chấp nhận và bóc tách thành công văn bản tiếng Việt UTF-8 chuẩn', async () => {
      const utf8Buffer = Buffer.from(sampleVietnameseText, 'utf-8');
      const result = await markdownParser.parse(utf8Buffer);

      expect(result).toBeDefined();
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.rawText).toContain('ă, â, đ, ê, ô, ơ, ư');
    });

    it('loại bỏ UTF-8 BOM và bóc tách thành công', async () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from(sampleVietnameseText, 'utf-8');
      const utf8WithBom = Buffer.concat([bom, content]);

      const result = await markdownParser.parse(utf8WithBom);
      expect(result.rawText.charCodeAt(0)).not.toBe(0xfeff);
      expect(result.rawText).toContain('ă, â, đ, ê, ô, ơ, ư');
    });

    it('từ chối tệp UTF-16 BE (Big Endian) và ném lỗi BadRequestException', async () => {
      // Create a UTF-16 BE buffer with BOM (0xFE 0xFF)
      const bom = Buffer.from([0xfe, 0xff]);
      const contentLe = Buffer.from(sampleVietnameseText, 'utf16le');
      // Swap bytes for BE
      const contentBe = Buffer.alloc(contentLe.length);
      for (let i = 0; i < contentLe.length; i += 2) {
        contentBe[i] = contentLe[i + 1];
        contentBe[i + 1] = contentLe[i];
      }
      const utf16BeBuffer = Buffer.concat([bom, contentBe]);

      await expect(markdownParser.parse(utf16BeBuffer)).rejects.toThrow(BadRequestException);
      await expect(markdownParser.parse(utf16BeBuffer)).rejects.toThrow(/UTF-16/i);
    });

    it('từ chối tệp UTF-16 LE (Little Endian) và ném lỗi BadRequestException', async () => {
      const bom = Buffer.from([0xff, 0xfe]);
      const contentLe = Buffer.from(sampleVietnameseText, 'utf16le');
      const utf16LeBuffer = Buffer.concat([bom, contentLe]);

      await expect(markdownParser.parse(utf16LeBuffer)).rejects.toThrow(BadRequestException);
      await expect(markdownParser.parse(utf16LeBuffer)).rejects.toThrow(/UTF-16/i);
    });

    it('từ chối tệp chứa ký tự null byte (0x00)', async () => {
      const corruptedBuffer = Buffer.from('Hệ thống DocuMind\x00AI Knowledge', 'utf-8');

      await expect(markdownParser.parse(corruptedBuffer)).rejects.toThrow(BadRequestException);
      await expect(markdownParser.parse(corruptedBuffer)).rejects.toThrow(/null byte/i);
    });
  });

  describe('DocumentService.validateTextFileEncoding', () => {
    it('chấp nhận buffer UTF-8 hợp lệ', () => {
      const validBuffer = Buffer.from(sampleVietnameseText, 'utf-8');
      expect(() => documentService.validateTextFileEncoding(validBuffer)).not.toThrow();
    });

    it('chặn ngay lập tức tệp UTF-16 BE tại bước kiểm tra encoding', () => {
      const bom = Buffer.from([0xfe, 0xff]);
      const dummyPayload = Buffer.from([0x00, 0x41, 0x00, 0x42]);
      const beBuffer = Buffer.concat([bom, dummyPayload]);

      expect(() => documentService.validateTextFileEncoding(beBuffer)).toThrow(BadRequestException);
      expect(() => documentService.validateTextFileEncoding(beBuffer)).toThrow(/UTF-16/i);
    });

    it('chặn ngay lập tức tệp UTF-16 LE tại bước kiểm tra encoding', () => {
      const bom = Buffer.from([0xff, 0xfe]);
      const dummyPayload = Buffer.from([0x41, 0x00, 0x42, 0x00]);
      const leBuffer = Buffer.concat([bom, dummyPayload]);

      expect(() => documentService.validateTextFileEncoding(leBuffer)).toThrow(BadRequestException);
      expect(() => documentService.validateTextFileEncoding(leBuffer)).toThrow(/UTF-16/i);
    });

    it('chặn tệp UTF-16 không có BOM nhờ phát hiện null byte 0x00', () => {
      const noBomUtf16 = Buffer.from([0x00, 0x4b, 0x00, 0x69, 0x00, 0x65, 0x00, 0x6d]);

      expect(() => documentService.validateTextFileEncoding(noBomUtf16)).toThrow(BadRequestException);
      expect(() => documentService.validateTextFileEncoding(noBomUtf16)).toThrow(/null byte/i);
    });
  });
});
