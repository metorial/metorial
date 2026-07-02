import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

export let generateThumbnail = SlateTool.create(spec, {
  name: 'Generate Thumbnail',
  key: 'generate_thumbnail',
  description: `Generate a thumbnail image preview from a PDF, Office document, or email file. Creates an image of the first page, useful for previews, galleries, and document listings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'Publicly accessible URL of the source document (PDF, DOCX, PPTX, XLSX, EML, MSG, etc.)'
        ),
      fileName: z.string().optional().describe('Desired file name for the thumbnail image'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the image opens in browser; if false, triggers download'),
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
      fileUrl: z.string().describe('URL to download the generated thumbnail image'),
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

    let result = await client.libreOfficeThumbnail({
      url: ctx.input.url,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    if (!result.success) {
      throw new Error(result.error || 'Thumbnail generation failed');
    }

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Generated thumbnail preview (${result.mbOut} MB, ${result.seconds}s). [Download](${result.fileUrl})`
    };
  })
  .build();
