import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  firecrawlFormatEnum,
  normalizePageData,
  pageDataSchema,
  requireBase64File
} from './shared';

export let parseFileTool = SlateTool.create(spec, {
  name: 'Parse File',
  key: 'parse_file',
  description: `Upload a file to Firecrawl v2 Parse and convert it into markdown or other extraction formats. Use this for local or non-public documents such as HTML, PDF, DOCX, DOC, ODT, RTF, XLSX, and XLS files.`,
  instructions: [
    'Provide the file as base64-encoded content with a filename.',
    'Use formats to request markdown, HTML, raw HTML, links, screenshot, summary, or JSON where supported.',
    'For PDFs, use pdfParserMode and pdfMaxPages to control parsing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded file content'),
      fileName: z.string().describe('Filename including extension, e.g. document.pdf'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type of the uploaded file. Defaults to application/octet-stream.'),
      formats: z.array(firecrawlFormatEnum).optional().describe('Output formats to request'),
      onlyMainContent: z.boolean().optional().describe('Extract only main content'),
      includeTags: z.array(z.string()).optional().describe('Only include CSS selectors'),
      excludeTags: z.array(z.string()).optional().describe('Exclude CSS selectors'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Headers for additional network requests'),
      timeout: z.number().optional().describe('Parse timeout in milliseconds'),
      disablePdfParsing: z.boolean().optional().describe('Disable PDF parsing'),
      pdfParserMode: z.enum(['fast', 'auto', 'ocr']).optional().describe('PDF parser mode'),
      pdfMaxPages: z.number().optional().describe('Maximum PDF pages to parse'),
      skipTlsVerification: z
        .boolean()
        .optional()
        .describe('Skip TLS certificate verification'),
      removeBase64Images: z.boolean().optional().describe('Remove base64 images from output'),
      blockAds: z.boolean().optional().describe('Enable ad and cookie popup blocking'),
      proxy: z.enum(['basic', 'auto']).optional().describe('Parse proxy mode'),
      origin: z.string().optional().describe('Origin label'),
      integration: z.string().optional().describe('Integration label'),
      zeroDataRetention: z.boolean().optional().describe('Enable zero-data-retention mode')
    })
  )
  .output(
    pageDataSchema.extend({
      success: z.boolean().optional().describe('Whether Firecrawl marked the parse successful')
    })
  )
  .handleInvocation(async ctx => {
    let { base64 } = requireBase64File(ctx.input.fileBase64, 'fileBase64');
    let client = new Client({ token: ctx.auth.token });
    let options: Record<string, unknown> = {};

    if (ctx.input.formats) options.formats = ctx.input.formats;
    if (ctx.input.onlyMainContent !== undefined)
      options.onlyMainContent = ctx.input.onlyMainContent;
    if (ctx.input.includeTags) options.includeTags = ctx.input.includeTags;
    if (ctx.input.excludeTags) options.excludeTags = ctx.input.excludeTags;
    if (ctx.input.headers) options.headers = ctx.input.headers;
    if (ctx.input.timeout !== undefined) options.timeout = ctx.input.timeout;
    if (ctx.input.disablePdfParsing) {
      options.parsers = [];
    } else if (ctx.input.pdfParserMode || ctx.input.pdfMaxPages !== undefined) {
      options.parsers = [
        {
          type: 'pdf',
          mode: ctx.input.pdfParserMode,
          maxPages: ctx.input.pdfMaxPages
        }
      ];
    }
    if (ctx.input.skipTlsVerification !== undefined)
      options.skipTlsVerification = ctx.input.skipTlsVerification;
    if (ctx.input.removeBase64Images !== undefined)
      options.removeBase64Images = ctx.input.removeBase64Images;
    if (ctx.input.blockAds !== undefined) options.blockAds = ctx.input.blockAds;
    if (ctx.input.proxy) options.proxy = ctx.input.proxy;
    if (ctx.input.origin) options.origin = ctx.input.origin;
    if (ctx.input.integration) options.integration = ctx.input.integration;
    if (ctx.input.zeroDataRetention !== undefined)
      options.zeroDataRetention = ctx.input.zeroDataRetention;

    let result = await client.parseFile({
      fileName: ctx.input.fileName,
      fileBase64: base64,
      mimeType: ctx.input.mimeType,
      options
    });
    let data = result.data ?? result;

    return {
      output: {
        ...normalizePageData(data),
        success: result.success
      },
      message: `Parsed **${ctx.input.fileName}** with Firecrawl.`
    };
  });
