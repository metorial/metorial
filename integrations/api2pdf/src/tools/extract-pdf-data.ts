import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';
import {
  api2PdfFileOutputSchema,
  fetchApi2PdfAttachment,
  fileAttachment,
  fileOutput
} from './shared';

export let extractPdfData = SlateTool.create(spec, {
  name: 'Extract PDF Data',
  key: 'extract_pdf_data',
  description: `Extract structured data from a PDF document. Supports extraction as JSON, Markdown, or HTML. Useful for automated content processing, indexing, and data extraction from PDF files.`,
  instructions: [
    'Use "json" format for structured data extraction suitable for programmatic processing.',
    'Use "markdown" format for readable text extraction.',
    'Use "html" format when you need to preserve formatting or index content.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Publicly accessible URL of the PDF to extract data from'),
      outputFormat: z
        .enum(['json', 'markdown', 'html'])
        .describe('Format of the extracted data'),
      fileName: z
        .string()
        .optional()
        .describe('Desired file name for the extracted data file'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source PDF')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result: any;

    if (ctx.input.outputFormat === 'json') {
      result = await client.extractJsonFromPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else if (ctx.input.outputFormat === 'markdown') {
      result = await client.extractMarkdownFromPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else {
      result = await client.extractHtmlFromPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        inline: ctx.input.inline,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    }

    let file = await fetchApi2PdfAttachment(client, result, 'PDF data extraction failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Extracted data from PDF as ${ctx.input.outputFormat.toUpperCase()} (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
