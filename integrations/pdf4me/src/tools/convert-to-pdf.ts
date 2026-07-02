import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertToPdf = SlateTool.create(spec, {
  name: 'Convert to PDF',
  key: 'convert_to_pdf',
  description: `Convert office documents (Word, Excel, PowerPoint), images, HTML, Markdown, or URLs into PDF format.
Supports **.docx, .xlsx, .pptx, .png, .jpg, .html, .md** and more. For HTML/Markdown, provide the file content as base64. For URL conversion, provide the web URL directly.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      source: z
        .enum(['file', 'url', 'html'])
        .describe(
          'Source type: "file" for documents/images, "url" for web pages, "html" for HTML content'
        ),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded file content (required for "file" and "html" source types)'),
      fileName: z
        .string()
        .optional()
        .describe(
          'File name with extension, e.g. "report.docx" (required for "file" and "html" source types)'
        ),
      url: z
        .string()
        .optional()
        .describe('Web URL to convert to PDF (required for "url" source type)'),
      urlAuthType: z
        .enum(['none', 'basic'])
        .optional()
        .describe('Authentication type for URL if the page requires login'),
      urlUsername: z.string().optional().describe('Username for URL authentication'),
      urlPassword: z.string().optional().describe('Password for URL authentication'),
      htmlLayout: z
        .enum(['portrait', 'landscape'])
        .optional()
        .describe('Page layout for HTML conversion'),
      htmlPageSize: z
        .string()
        .optional()
        .describe('Paper size for HTML conversion (e.g. "A4", "Letter")'),
      htmlScale: z.number().optional().describe('Scale factor for HTML conversion'),
      printBackground: z
        .boolean()
        .optional()
        .describe('Whether to print background images for HTML conversion')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('Output PDF file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { fileContent: string; fileName: string };

    if (ctx.input.source === 'url') {
      if (!ctx.input.url) {
        throw new Error('URL is required for URL source type');
      }
      result = await client.convertUrlToPdf({
        webUrl: ctx.input.url,
        authType: ctx.input.urlAuthType === 'basic' ? 'Basic' : undefined,
        username: ctx.input.urlUsername,
        password: ctx.input.urlPassword
      });
    } else if (ctx.input.source === 'html') {
      if (!ctx.input.fileContent || !ctx.input.fileName) {
        throw new Error('File content and file name are required for HTML source type');
      }
      result = await client.convertHtmlToPdf({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        layout: ctx.input.htmlLayout,
        format: ctx.input.htmlPageSize,
        scale: ctx.input.htmlScale,
        printBackground: ctx.input.printBackground
      });
    } else {
      if (!ctx.input.fileContent || !ctx.input.fileName) {
        throw new Error('File content and file name are required for file source type');
      }
      result = await client.convertToPdf({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName
      });
    }

    return {
      output: result,
      message: `Successfully converted to PDF: **${result.fileName}**`
    };
  })
  .build();
