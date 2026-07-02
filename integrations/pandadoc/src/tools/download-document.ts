import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Download a PandaDoc document and return the file content as a Slate attachment, with structured output limited to file metadata.`,
  constraints: [
    'The standard PandaDoc download endpoint returns a PDF for documents that are ready to export.',
    'If PandaDoc is still preparing the file, retry after the service-provided delay.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to download'),
      watermarkText: z.string().optional().describe('Optional watermark text'),
      watermarkColor: z
        .string()
        .optional()
        .describe('Optional watermark color, such as "#FF0000"'),
      watermarkFontSize: z.number().optional().describe('Optional watermark font size'),
      watermarkOpacity: z.number().optional().describe('Optional watermark opacity'),
      separateFiles: z
        .boolean()
        .optional()
        .describe('If true, request separate files when PandaDoc supports it')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('UUID of the document'),
      mimeType: z.string().describe('MIME type of the returned attachment'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.downloadDocument(ctx.input.documentId, {
      watermark_text: ctx.input.watermarkText,
      watermark_color: ctx.input.watermarkColor,
      watermark_font_size: ctx.input.watermarkFontSize,
      watermark_opacity: ctx.input.watermarkOpacity,
      separate_files: ctx.input.separateFiles
    });

    return {
      output: {
        documentId: ctx.input.documentId,
        mimeType: result.mimeType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(result.contentBase64, result.mimeType)],
      message: `Downloaded document \`${ctx.input.documentId}\` as an attachment.`
    };
  })
  .build();
