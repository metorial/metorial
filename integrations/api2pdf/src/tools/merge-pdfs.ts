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

export let mergePdfs = SlateTool.create(spec, {
  name: 'Merge PDFs',
  key: 'merge_pdfs',
  description: `Combine multiple PDF documents into a single PDF file. Provide URLs to the PDF files to be merged. The PDFs are merged in the order provided.`,
  instructions: [
    'All URLs must point to publicly accessible PDF files.',
    'PDFs are merged in the order of the urls array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .min(2)
        .describe('URLs of PDF files to merge, in desired order'),
      fileName: z.string().optional().describe('Desired file name for the merged PDF'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the PDF opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source PDFs')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.pdfSharpMerge({
      urls: ctx.input.urls,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'PDF merge failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Merged **${ctx.input.urls.length}** PDFs into one document (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
