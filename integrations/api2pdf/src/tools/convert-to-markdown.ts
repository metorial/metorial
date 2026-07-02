import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

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
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source document')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the generated Markdown file'),
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

    let result = await client.convertToMarkdown({
      url: ctx.input.url,
      fileName: ctx.input.fileName,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    if (!result.success) {
      throw new Error(result.error || 'Markdown conversion failed');
    }

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Converted document to Markdown (${result.mbOut} MB, ${result.seconds}s). [Download](${result.fileUrl})`
    };
  })
  .build();
