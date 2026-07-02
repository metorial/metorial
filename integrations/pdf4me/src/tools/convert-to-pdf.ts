import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdf4meServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  fileAttachment,
  fileAttachmentOutputSchema,
  fileOutput,
  type Pdf4meFileResult
} from './shared';

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
        .enum(['file', 'url', 'html', 'markdown'])
        .describe(
          'Source type: "file" for documents/images, "url" for web pages, "html" for HTML content, "markdown" for Markdown content or ZIP archives'
        ),
      fileContent: z
        .string()
        .optional()
        .describe(
          'Base64-encoded file content (required for "file", "html", and "markdown" source types)'
        ),
      fileName: z
        .string()
        .optional()
        .describe(
          'File name with extension, e.g. "report.docx" or "readme.md" (required for "file", "html", and "markdown" source types)'
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
        .describe('Whether to print background images for HTML conversion'),
      markdownFilePath: z
        .string()
        .optional()
        .describe('Path to the Markdown file inside a ZIP archive for "markdown" source type')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: Pdf4meFileResult;

    if (ctx.input.source === 'url') {
      if (!ctx.input.url) {
        throw pdf4meServiceError('URL is required for URL source type');
      }
      result = await client.convertUrlToPdf({
        webUrl: ctx.input.url,
        authType: ctx.input.urlAuthType === 'basic' ? 'Basic' : undefined,
        username: ctx.input.urlUsername,
        password: ctx.input.urlPassword
      });
    } else if (ctx.input.source === 'html') {
      if (!ctx.input.fileContent || !ctx.input.fileName) {
        throw pdf4meServiceError(
          'File content and file name are required for HTML source type'
        );
      }
      result = await client.convertHtmlToPdf({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        layout: ctx.input.htmlLayout,
        format: ctx.input.htmlPageSize,
        scale: ctx.input.htmlScale,
        printBackground: ctx.input.printBackground
      });
    } else if (ctx.input.source === 'markdown') {
      if (!ctx.input.fileContent || !ctx.input.fileName) {
        throw pdf4meServiceError(
          'File content and file name are required for Markdown source type'
        );
      }
      result = await client.convertMarkdownToPdf({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        mdFilePath: ctx.input.markdownFilePath
      });
    } else {
      if (!ctx.input.fileContent || !ctx.input.fileName) {
        throw pdf4meServiceError(
          'File content and file name are required for file source type'
        );
      }
      result = await client.convertToPdf({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName
      });
    }

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully converted to PDF: **${result.fileName}**`
    };
  })
  .build();
