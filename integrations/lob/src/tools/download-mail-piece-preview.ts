import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  addMailPiecePreview,
  getMailPiece,
  getPreviewDownload,
  getPreviewState,
  previewReferenceSchema
} from '../lib/mail-piece-preview';
import { spec } from '../spec';

export let downloadMailPiecePreview = SlateTool.create(spec, {
  name: 'Download Mail Piece Preview',
  key: 'download_mail_piece_preview',
  description:
    'Download a PDF preview of a postcard, letter, self-mailer, or check. If rendering is pending, repeat this call after retryAfterSeconds.',
  tags: { destructive: false, readOnly: true }
})
  .input(previewReferenceSchema)
  .output(
    z.object({
      mailPieceId: z.string(),
      status: z.enum(['ready', 'pending', 'failed']).describe('PDF preview availability'),
      upstreamStatus: z.string().nullable().describe('Lob render status, when returned'),
      retryAfterSeconds: z
        .number()
        .nullable()
        .describe('Suggested delay before requesting a pending preview again')
    })
  )
  .handleInvocation(async ctx => {
    let resource = await getMailPiece(new Client({ token: ctx.auth.token }), ctx.input);
    let status = getPreviewState(resource);
    await addMailPiecePreview(ctx, resource, ctx.input.mailPieceType);
    return {
      output: {
        mailPieceId: resource.id,
        status,
        upstreamStatus: resource.status ?? null,
        retryAfterSeconds: status === 'pending' ? 5 : null
      },
      message:
        status === 'ready'
          ? `PDF preview for **${resource.id}** is ready to download`
          : `PDF preview for **${resource.id}** is ${status}`
    };
  });

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = previewReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The PDF reference is invalid. Request the mail piece preview again.'
    );
  }
  let resource = await getMailPiece(new Client({ token: ctx.auth.token }), reference.data);
  return getPreviewDownload(resource);
});
