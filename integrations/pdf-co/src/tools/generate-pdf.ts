import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfCoApiError } from '../lib/errors';
import { spec } from '../spec';
import {
  createPdfCoAttachment,
  downloadPdfCoOutput,
  fileAttachmentOutputFields,
  toFileOutput
} from './shared';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Create a PDF document from various sources including HTML content, a web URL, a document file (DOC, DOCX, RTF, TXT, XPS), or an image file (JPG, PNG, TIFF).
Supports configurable paper size, margins, orientation, and custom headers/footers when generating from HTML or URL.`,
  instructions: [
    'Specify exactly one source: "html" for raw HTML content, "sourceUrl" with sourceType "url" for a web page, or "sourceUrl" with sourceType "document" or "image" for file conversion.',
    'Paper size, margins, orientation, header, and footer options only apply to HTML and URL sources.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceType: z
        .enum(['html', 'url', 'document', 'image'])
        .describe('Type of source to generate PDF from'),
      html: z
        .string()
        .optional()
        .describe('HTML content to convert (required when sourceType is "html")'),
      sourceUrl: z
        .string()
        .optional()
        .describe(
          'URL of the source file or web page (required when sourceType is not "html")'
        ),
      outputFileName: z.string().optional().describe('Name for the output PDF file'),
      paperSize: z
        .string()
        .optional()
        .describe('Paper size, e.g. "A4", "Letter", "Legal", or custom "200px 300px"'),
      orientation: z.enum(['Portrait', 'Landscape']).optional().describe('Page orientation'),
      margins: z
        .string()
        .optional()
        .describe('Page margins, e.g. "5mm" or "10px 20px 10px 20px" (top right bottom left)'),
      printBackground: z
        .boolean()
        .optional()
        .describe('Include background colors and images (default: true)'),
      header: z.string().optional().describe('Custom HTML for page header'),
      footer: z.string().optional().describe('Custom HTML for page footer'),
      mediaType: z
        .enum(['print', 'screen', 'none'])
        .optional()
        .describe('CSS media type for rendering'),
      renderTimeout: z
        .number()
        .optional()
        .describe('Max milliseconds to wait for page rendering (URL source only, max 177000)')
    })
  )
  .output(
    z.object({
      ...fileAttachmentOutputFields,
      pageCount: z.number().describe('Number of pages in the generated PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.sourceType === 'html') {
      if (!ctx.input.html) {
        throw createApiServiceError('HTML content is required when sourceType is "html".');
      }
      result = await client.convertHtmlToPdf({
        html: ctx.input.html,
        name: ctx.input.outputFileName,
        margins: ctx.input.margins,
        paperSize: ctx.input.paperSize,
        orientation: ctx.input.orientation,
        printBackground: ctx.input.printBackground,
        header: ctx.input.header,
        footer: ctx.input.footer,
        mediaType: ctx.input.mediaType
      });
    } else if (ctx.input.sourceType === 'url') {
      if (!ctx.input.sourceUrl) {
        throw createApiServiceError('Source URL is required when sourceType is "url".');
      }
      result = await client.convertUrlToPdf({
        url: ctx.input.sourceUrl,
        name: ctx.input.outputFileName,
        margins: ctx.input.margins,
        paperSize: ctx.input.paperSize,
        orientation: ctx.input.orientation,
        printBackground: ctx.input.printBackground,
        header: ctx.input.header,
        footer: ctx.input.footer,
        mediaType: ctx.input.mediaType,
        renderTimeout: ctx.input.renderTimeout
      });
    } else if (ctx.input.sourceType === 'document') {
      if (!ctx.input.sourceUrl) {
        throw createApiServiceError('Source URL is required when sourceType is "document".');
      }
      result = await client.convertDocumentToPdf({
        url: ctx.input.sourceUrl,
        name: ctx.input.outputFileName
      });
    } else {
      if (!ctx.input.sourceUrl) {
        throw createApiServiceError('Source URL is required when sourceType is "image".');
      }
      result = await client.convertImageToPdf({
        url: ctx.input.sourceUrl,
        name: ctx.input.outputFileName
      });
    }

    if (result.error) {
      throw pdfCoApiError('PDF generation failed', result);
    }
    let file = await downloadPdfCoOutput(client, result, 'application/pdf');

    return {
      output: toFileOutput(result, file),
      attachments: [createPdfCoAttachment(file)],
      message: `Generated PDF from **${ctx.input.sourceType}** source — ${result.pageCount} page(s), returned as an attachment.`
    };
  })
  .build();
