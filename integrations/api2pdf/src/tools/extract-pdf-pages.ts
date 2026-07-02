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

export let extractPdfPages = SlateTool.create(spec, {
  name: 'Extract PDF Pages',
  key: 'extract_pdf_pages',
  description: `Extract a specific range of pages from an existing PDF document. Specify start and end page numbers (0-indexed) to create a new PDF with only those pages. Supports negative indexing (e.g., -1 for the last page).`,
  instructions: [
    'Page numbers are 0-indexed: the first page is 0, the second is 1, etc.',
    'Negative indexing is supported: -1 refers to the last page, -2 to the second-to-last, etc.',
    'If start is omitted, extraction begins from the first page.',
    'If end is omitted, extraction continues to the last page.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Publicly accessible URL of the source PDF'),
      start: z
        .number()
        .optional()
        .describe('Start page index (0-indexed, inclusive). Supports negative indexing.'),
      end: z
        .number()
        .optional()
        .describe('End page index (0-indexed, inclusive). Supports negative indexing.'),
      fileName: z.string().optional().describe('Desired file name for the extracted PDF'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the PDF opens in browser; if false, triggers download'),
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

    let result = await client.pdfSharpExtractPages({
      url: ctx.input.url,
      start: ctx.input.start,
      end: ctx.input.end,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'Page extraction failed');

    let rangeDesc = '';
    if (ctx.input.start !== undefined && ctx.input.end !== undefined) {
      rangeDesc = `pages ${ctx.input.start} to ${ctx.input.end}`;
    } else if (ctx.input.start !== undefined) {
      rangeDesc = `from page ${ctx.input.start} onward`;
    } else if (ctx.input.end !== undefined) {
      rangeDesc = `up to page ${ctx.input.end}`;
    } else {
      rangeDesc = 'all pages';
    }

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Extracted ${rangeDesc} from PDF (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
