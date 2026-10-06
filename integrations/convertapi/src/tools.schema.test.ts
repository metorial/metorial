import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('ConvertAPI tool schemas', provider.actions);
const action = (key: string) => provider.actions.find(a => a.key === key)!;
describe('ConvertAPI compatibility contracts', () => {
  it('retains all fifteen legacy keys and exactly two approved additions', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual([
      'compress_pdf',
      'convert_file',
      'convert_file_async',
      'decrypt_pdf',
      'delete_async_job',
      'delete_file',
      'download_file',
      'extract_text',
      'get_account_info',
      'get_async_job_result',
      'list_supported_conversions',
      'merge_pdf',
      'pdf_to_pdfa',
      'protect_pdf',
      'split_pdf',
      'upload_file',
      'watermark_pdf'
    ]);
    for (const a of provider.actions) expect(`convertapi-${a.key}`.length).toBeLessThan(60);
  });
  it('preserves source alternatives and legacy option types/defaults', () => {
    for (const file of [
      { url: 'https://example.invalid/source.pdf' },
      { fileId: 'a'.repeat(32) },
      { base64Data: 'cGRm', fileName: 'source.pdf' }
    ]) {
      expect(
        action('convert_file').inputSchema.safeParse({
          sourceFormat: 'pdf',
          destinationFormat: 'txt',
          file
        }).success
      ).toBe(true);
      expect(
        action('convert_file_async').inputSchema.safeParse({
          sourceFormat: 'pdf',
          destinationFormat: 'txt',
          file
        }).success
      ).toBe(true);
      expect(
        action('split_pdf').inputSchema.safeParse({ file, splitByPage: '2' }).success
      ).toBe(true);
      expect(
        action('watermark_pdf').inputSchema.safeParse({
          file,
          watermarkText: 'DRAFT',
          watermarkFontSize: '48',
          watermarkOpacity: '0',
          watermarkRotation: '45'
        }).success
      ).toBe(true);
    }
    const file = { fileId: 'a'.repeat(32) };
    expect(
      action('convert_file').inputSchema.parse({
        sourceFormat: 'pdf',
        destinationFormat: 'txt',
        file
      }).storeFile
    ).toBe(false);
    expect(
      action('convert_file_async').inputSchema.parse({
        sourceFormat: 'pdf',
        destinationFormat: 'txt',
        file
      }).storeFile
    ).toBe(true);
    expect(
      action('watermark_pdf').inputSchema.safeParse({ file, watermarkFontSize: 48 }).success
    ).toBe(false);
    expect(action('merge_pdf').inputSchema.safeParse({ files: [file] }).success).toBe(false);
    expect(
      action('protect_pdf').inputSchema.safeParse({
        file,
        allowPrinting: false,
        allowCopying: false
      }).success
    ).toBe(true);
  });
  it('keeps legacy nullable file fields and allows missing native duration/account identifier', () => {
    const file = {
      fileName: 'result.pdf',
      fileExt: 'pdf',
      fileSize: 3,
      fileId: null,
      url: null
    };
    expect(
      action('convert_file').outputSchema.safeParse({
        conversionCost: 1,
        conversionTime: 2,
        files: [file]
      }).success
    ).toBe(true);
    expect(
      action('convert_file').outputSchema.safeParse({
        conversionCost: 1,
        conversionTime: undefined,
        files: [file]
      }).success
    ).toBe(true);
    expect(
      action('extract_text').outputSchema.safeParse({
        conversionCost: 1,
        conversionTime: undefined,
        fileName: 'text.txt',
        fileSize: 3,
        textContent: null,
        fileId: null,
        url: null
      }).success
    ).toBe(true);
    expect(
      action('get_account_info').outputSchema.safeParse({
        active: true,
        fullName: 'Synthetic',
        email: 'synthetic@example.invalid',
        conversionsTotal: 100,
        conversionsConsumed: 1,
        conversionsRemaining: 99
      }).success
    ).toBe(true);
    for (const status of ['processing', 'completed', 'not_found'])
      expect(
        action('get_async_job_result').outputSchema.safeParse({
          status,
          conversionCost: null,
          conversionTime: null,
          files: null
        }).success
      ).toBe(true);
  });
});
