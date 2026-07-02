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

export let convertToMarkdown = SlateTool.create(spec, {
  name: 'Convert to Markdown',
  key: 'convert_to_markdown',
  description: `Convert a document file to Markdown format using Markitdown. Accepts any file type URL and produces a Markdown representation. Useful for extracting readable text content from various document formats.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('Publicly accessible URL of the document to convert to Markdown'),
      fileName: z
        .string()
        .optional()
        .describe('Desired file name for the output Markdown file'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source document')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.convertToMarkdown({
      url: ctx.input.url,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'Markdown conversion failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Converted document to Markdown (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
