import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

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
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source PDF')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the extracted data file'),
      mbOut: z.number().describe('Size of the generated file in megabytes'),
      cost: z.number().describe('Cost of this API call in USD'),
      seconds: z.number().describe('Processing time in seconds')
    })
  )
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
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else if (ctx.input.outputFormat === 'markdown') {
      result = await client.extractMarkdownFromPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    } else {
      result = await client.extractHtmlFromPdf({
        url: ctx.input.url,
        fileName: ctx.input.fileName,
        extraHTTPHeaders: ctx.input.extraHttpHeaders
      });
    }

    if (!result.success) {
      throw new Error(result.error || 'PDF data extraction failed');
    }

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Extracted data from PDF as ${ctx.input.outputFormat.toUpperCase()} (${result.mbOut} MB, ${result.seconds}s). [Download](${result.fileUrl})`
    };
  })
  .build();
