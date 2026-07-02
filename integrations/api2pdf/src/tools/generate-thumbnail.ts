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
  .output(api2PdfFileOutputSchema)
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

    let file = await fetchApi2PdfAttachment(client, result, 'Thumbnail generation failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Generated thumbnail preview (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
