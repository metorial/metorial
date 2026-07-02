import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let languageEnum = z.enum([
  'ara',
  'bul',
  'chs',
  'cht',
  'hrv',
  'cze',
  'dan',
  'dut',
  'eng',
  'fin',
  'fre',
  'ger',
  'gre',
  'hun',
  'kor',
  'ita',
  'jpn',
  'pol',
  'por',
  'rus',
  'slv',
  'spa',
  'swe',
  'tha',
  'tur',
  'ukr',
  'vnm',
  'auto'
]);

export let extractText = SlateTool.create(spec, {
  name: 'Extract Text',
  key: 'extract_text',
  description: `Extracts text from an image or PDF document using OCR. Provide the source as a **URL** or **Base64-encoded string**. Supports JPG, PNG, GIF, BMP, TIFF, and PDF formats.

Choose between three OCR engines:
- **Engine 1** (default): Fastest, widest language support including Asian languages.
- **Engine 2**: Better for complex backgrounds, rotated text, road signs, license plates.
- **Engine 3**: Best quality, 200+ languages, handwriting recognition, table/layout detection.

Enable table mode for structured documents like receipts and invoices.`,
  instructions: [
    'Provide exactly one of "sourceUrl" or "base64Image" as the input source.',
    'For Base64 input, include the content-type prefix, e.g. "data:image/png;base64,iVBOR...".',
    'Use engine 3 with language "auto" for handwriting recognition or when language is unknown.'
  ],
  constraints: [
    'Free tier: max 1 MB file size, max 3 PDF pages, 25,000 requests/month.',
    'Engine 3 is slower and still in development with no uptime guarantee.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().optional().describe('URL of the image or PDF to process'),
      base64Image: z
        .string()
        .optional()
        .describe(
          'Base64-encoded image/PDF with content-type prefix (e.g. "data:image/png;base64,...")'
        ),
      language: languageEnum
        .optional()
        .default('eng')
        .describe(
          'Language code for OCR recognition. Use "auto" for automatic detection (Engine 3 only).'
        ),
      ocrEngine: z
        .enum(['1', '2', '3'])
        .optional()
        .default('1')
        .describe(
          'OCR engine to use: "1" (fastest), "2" (complex backgrounds), "3" (best quality)'
        ),
      detectOrientation: z
        .boolean()
        .optional()
        .default(false)
        .describe('Auto-rotate the image and report detected orientation'),
      scale: z
        .boolean()
        .optional()
        .default(false)
        .describe('Upscale low-resolution images to improve OCR results'),
      isTable: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Optimize for table-structured documents (receipts, invoices) with line-by-line output'
        ),
      filetype: z
        .enum(['PDF', 'GIF', 'PNG', 'JPG', 'TIF', 'BMP'])
        .optional()
        .describe('Override auto-detected file type')
    })
  )
  .output(
    z.object({
      extractedText: z.string().describe('Full extracted text from all pages combined'),
      pages: z
        .array(
          z.object({
            pageNumber: z.number().describe('Page number (1-indexed)'),
            text: z.string().describe('Extracted text for this page'),
            exitCode: z.number().describe('Parse exit code for this page (1 = success)'),
            errorMessage: z.string().nullable().describe('Error message for this page, if any')
          })
        )
        .describe('Per-page OCR results'),
      ocrExitCode: z
        .number()
        .describe('Overall OCR exit code (1 = fully parsed, 2 = partially parsed)'),
      processingTimeMs: z.number().describe('Processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.sourceUrl && !ctx.input.base64Image) {
      throw new Error('Either "sourceUrl" or "base64Image" must be provided.');
    }

    let client = new Client({ token: ctx.auth.token });

    ctx.info('Starting OCR text extraction...');

    let result = await client.parseImage({
      url: ctx.input.sourceUrl,
      base64Image: ctx.input.base64Image,
      language: ctx.input.language,
      ocrEngine: Number(ctx.input.ocrEngine) as 1 | 2 | 3,
      detectOrientation: ctx.input.detectOrientation,
      scale: ctx.input.scale,
      isTable: ctx.input.isTable,
      filetype: ctx.input.filetype
    });

    let pages = result.parsedResults.map((r, i) => ({
      pageNumber: i + 1,
      text: r.parsedText || '',
      exitCode: r.fileParseExitCode,
      errorMessage: r.errorMessage
    }));

    let extractedText = pages.map(p => p.text).join('\n\n');

    let pageCount = pages.length;
    let successCount = pages.filter(p => p.exitCode === 1).length;

    return {
      output: {
        extractedText,
        pages,
        ocrExitCode: result.ocrExitCode,
        processingTimeMs: result.processingTimeInMilliseconds
      },
      message: `Extracted text from ${successCount}/${pageCount} page(s) in ${result.processingTimeInMilliseconds}ms using Engine ${ctx.input.ocrEngine}. Extracted ${extractedText.length} characters total.`
    };
  })
  .build();
