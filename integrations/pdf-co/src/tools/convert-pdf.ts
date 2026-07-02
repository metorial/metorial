import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  assertPdfCoSuccess,
  conversionMimeType,
  createPdfCoAttachment,
  downloadPdfCoOutput,
  fileAttachmentOutputFields,
  toFileOutput
} from './shared';

export let convertPdf = SlateTool.create(spec, {
  name: 'Convert PDF',
  key: 'convert_pdf',
  description: `Convert a PDF document to another format such as CSV, JSON, text, Excel, XML, HTML, or image formats.
Supports OCR for scanned documents, page selection, and password-protected PDFs.
Use this to extract tabular data (CSV/Excel), structured content (JSON/XML), plain text, or render pages as images.`,
  instructions: [
    'Provide the URL of the PDF file to convert. The file must be accessible via a public URL or a PDF.co temporary file URL.',
    'For scanned documents, use the "lang" parameter to set the OCR language (default: "eng").',
    'Use "pages" to limit conversion to specific pages, e.g. "0,2,3" or "0-5".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source PDF file to convert'),
      outputFormat: z
        .enum([
          'csv',
          'json',
          'text',
          'xls',
          'xlsx',
          'xml',
          'html',
          'jpg',
          'png',
          'webp',
          'tiff'
        ])
        .describe('Target format for conversion'),
      pages: z
        .string()
        .optional()
        .describe('Page indices to convert, e.g. "0,1,2" or "0-5" or "!0" for last page'),
      lang: z
        .string()
        .optional()
        .describe('OCR language code for scanned documents, e.g. "eng", "fra", "deu"'),
      password: z.string().optional().describe('Password for protected PDF files'),
      outputFileName: z.string().optional().describe('Name for the output file'),
      extractionRect: z
        .string()
        .optional()
        .describe('Rectangular area to extract from, format: "x y width height"'),
      unwrapLines: z
        .boolean()
        .optional()
        .describe('Unwrap lines within table cells (CSV/text)')
    })
  )
  .output(
    z.object({
      ...fileAttachmentOutputFields,
      pageCount: z.number().describe('Number of pages in the source document'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.convertPdfTo(ctx.input.outputFormat, {
      url: ctx.input.sourceUrl,
      pages: ctx.input.pages,
      lang: ctx.input.lang,
      password: ctx.input.password,
      name: ctx.input.outputFileName,
      rect: ctx.input.extractionRect,
      unwrap: ctx.input.unwrapLines
    });

    result = assertPdfCoSuccess(result, 'PDF conversion failed');
    if (!('url' in result)) {
      throw createApiServiceError('PDF.co returned inline content instead of a file URL.');
    }
    let file = await downloadPdfCoOutput(
      client,
      result,
      conversionMimeType(ctx.input.outputFormat)
    );

    return {
      output: toFileOutput(result, file),
      attachments: [createPdfCoAttachment(file)],
      message: `Converted PDF to **${ctx.input.outputFormat.toUpperCase()}** successfully and returned the file as an attachment.`
    };
  })
  .build();
