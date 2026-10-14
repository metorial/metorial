import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Original Document',
  key: 'download_document',
  description:
    'Prepare the original document file for download before signatures were applied.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z
        .string()
        .min(1)
        .describe('Document ID from get_signature_request or manage_document')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });
    let document = await client.getDocument(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.ignisign.io/v4/documents/${encodeURIComponent(ctx.input.documentId)}/file`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename: document.fileName,
      mimeType: document.mimeType
    });
    return {
      output: {
        documentId: ctx.input.documentId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize
      },
      message: `Prepared original document **${ctx.input.documentId}** for download.`
    };
  })
  .build();
