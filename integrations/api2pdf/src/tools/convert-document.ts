import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { api2PdfServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  api2PdfFileOutputSchema,
  fetchApi2PdfAttachment,
  fileAttachment,
  fileOutput
} from './shared';

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Convert documents between formats using LibreOffice. Supports converting Word, PowerPoint, Excel, images, and other file types to PDF. Also supports converting HTML to Word (DOCX), HTML to Excel (XLSX). Provide a publicly accessible URL to the source file.`,
  instructions: [
    'Set outputFormat to "pdf" to convert any supported document to PDF.',
    'Set outputFormat to "docx" to convert HTML to a Word document.',
    'Set outputFormat to "xlsx" to convert HTML tables to an Excel spreadsheet.',
    'For DOCX/XLSX output, provide either html or url as the source.',
    'For PDF output, provide the url of the document to convert.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      outputFormat: z.enum(['pdf', 'docx', 'xlsx']).describe('Target output format'),
      url: z.string().optional().describe('Publicly accessible URL of the source document'),
      html: z.string().optional().describe('Raw HTML content (only for docx or xlsx output)'),
      fileName: z.string().optional().describe('Desired file name for the output'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source URL')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result: any;

    if (ctx.input.outputFormat === 'pdf') {
      if (!ctx.input.url) {
        throw api2PdfServiceError('A url is required for PDF conversion');
      }
      result = await client.libreOfficeAnyToPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else if (ctx.input.outputFormat === 'docx') {
      if (!ctx.input.html && !ctx.input.url) {
        throw api2PdfServiceError('Either html or url is required for DOCX conversion');
      }
      result = await client.libreOfficeHtmlToDocx({
        html: ctx.input.html,
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else {
      if (!ctx.input.html && !ctx.input.url) {
        throw api2PdfServiceError('Either html or url is required for XLSX conversion');
      }
      result = await client.libreOfficeHtmlToXlsx({
        html: ctx.input.html,
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    }

    let file = await fetchApi2PdfAttachment(client, result, 'Document conversion failed');

    let formatLabel = ctx.input.outputFormat.toUpperCase();

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Converted document to ${formatLabel} (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
