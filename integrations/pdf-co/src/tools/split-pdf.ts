import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfCoApiError } from '../lib/errors';
import { spec } from '../spec';
import { createPdfCoAttachment } from './shared';

export let splitPdf = SlateTool.create(spec, {
  name: 'Split PDF',
  key: 'split_pdf',
  description: `Split a PDF document into multiple files. Supports splitting by page ranges or by text/barcode content found in pages.
When splitting by pages, specify comma-separated page ranges. When splitting by text or barcode, specify a search string to determine split points.`,
  instructions: [
    'For page-based splitting, use "pages" mode and specify ranges like "1-3,4-6,7-" to create separate PDFs for each range.',
    'For text/barcode-based splitting, use "textOrBarcode" mode. Use "[[barcode:qrcode]]" to split on QR codes, or a text string to split at pages containing that text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source PDF file to split'),
      splitMode: z
        .enum(['pages', 'textOrBarcode'])
        .describe('Split by page ranges or by text/barcode content'),
      pages: z
        .string()
        .optional()
        .describe(
          '1-based page ranges for splitting, e.g. "1-3,4-6,7-" (required for "pages" mode)'
        ),
      searchString: z
        .string()
        .optional()
        .describe(
          'Text or barcode pattern to split on (required for "textOrBarcode" mode). Use "[[barcode:qrcode]]" for QR codes.'
        ),
      excludeKeyPages: z
        .boolean()
        .optional()
        .describe(
          'Exclude pages containing the search string from the output (textOrBarcode mode)'
        ),
      regexSearch: z
        .boolean()
        .optional()
        .describe('Enable regex matching for the search string (textOrBarcode mode)'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Case-sensitive search (textOrBarcode mode, default: true)'),
      password: z.string().optional().describe('Password for protected PDF files'),
      outputFileName: z.string().optional().describe('Base name for the output files')
    })
  )
  .output(
    z.object({
      outputUrls: z.array(z.string()).describe('URLs to download the split PDF files'),
      outputFiles: z
        .array(
          z.object({
            outputUrl: z.string().describe('PDF.co temporary output URL'),
            mimeType: z.string().describe('MIME type of the returned attachment'),
            byteLength: z.number().describe('Decoded byte length of the attachment')
          })
        )
        .describe('Attachment metadata for each split file in attachment order'),
      partCount: z.number().describe('Number of parts the PDF was split into'),
      pageCount: z.number().describe('Total pages in the source document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.splitMode === 'pages') {
      if (!ctx.input.pages) {
        throw createApiServiceError('Pages parameter is required for page-based splitting.');
      }
      result = await client.splitPdfByPages({
        url: ctx.input.sourceUrl,
        pages: ctx.input.pages,
        name: ctx.input.outputFileName,
        password: ctx.input.password
      });
    } else {
      if (!ctx.input.searchString) {
        throw createApiServiceError(
          'Search string is required for text/barcode-based splitting.'
        );
      }
      result = await client.splitPdfByTextOrBarcode({
        url: ctx.input.sourceUrl,
        searchString: ctx.input.searchString,
        excludeKeyPages: ctx.input.excludeKeyPages,
        regexSearch: ctx.input.regexSearch,
        caseSensitive: ctx.input.caseSensitive,
        name: ctx.input.outputFileName,
        password: ctx.input.password
      });
    }

    if (result.error) {
      throw pdfCoApiError('Split failed', result);
    }
    let files = await Promise.all(
      result.urls.map((url: string) => client.downloadFileUrl(url, 'application/pdf'))
    );

    return {
      output: {
        outputUrls: result.urls,
        outputFiles: result.urls.map((url: string, index: number) => ({
          outputUrl: url,
          mimeType: files[index]?.mimeType || 'application/pdf',
          byteLength: files[index]?.byteLength || 0
        })),
        partCount: result.urls.length,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits,
        attachmentCount: files.length
      },
      attachments: files.map(createPdfCoAttachment),
      message: `Split PDF into **${result.urls.length}** parts using **${ctx.input.splitMode}** mode.`
    };
  })
  .build();
