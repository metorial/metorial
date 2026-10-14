import { createApiServiceError, type SlateAddAttachmentInput } from 'slates';
import { z } from 'zod';
import type { Client } from './client';

export let mailPieceTypeSchema = z.enum(['postcard', 'letter', 'self_mailer', 'check']);
export let previewReferenceSchema = z.object({
  mailPieceType: mailPieceTypeSchema,
  mailPieceId: z.string().min(1)
});

export type PreviewReference = z.infer<typeof previewReferenceSchema>;
export type MailPiecePreview = {
  id: string;
  url?: string | null;
  status?: string | null;
};

let REFRESH_MARGIN_MS = 5 * 60 * 1000;
let CONSERVATIVE_REFRESH_MS = 24 * 60 * 60 * 1000;

export let getMailPiece = (
  client: Client,
  reference: PreviewReference
): Promise<MailPiecePreview> => {
  switch (reference.mailPieceType) {
    case 'postcard':
      return client.getPostcard(reference.mailPieceId);
    case 'letter':
      return client.getLetter(reference.mailPieceId);
    case 'self_mailer':
      return client.getSelfMailer(reference.mailPieceId);
    case 'check':
      return client.getCheck(reference.mailPieceId);
  }
};

export let getPreviewState = (resource: MailPiecePreview): 'ready' | 'pending' | 'failed' => {
  if (resource.status === 'failed') return 'failed';
  if (resource.url && (resource.status == null || resource.status === 'rendered'))
    return 'ready';
  return 'pending';
};

export let getPreviewDownload = (resource: MailPiecePreview) => {
  if (getPreviewState(resource) !== 'ready' || !resource.url) {
    throw createApiServiceError(
      'The mail piece PDF is not ready. Retrieve the preview again after rendering finishes.'
    );
  }
  let url: URL;
  try {
    url = new URL(resource.url);
  } catch {
    throw createApiServiceError(
      'Lob returned an invalid PDF URL. Retrieve the mail piece again.'
    );
  }
  if (url.protocol !== 'https:' || url.hostname !== 'lob-assets.com') {
    throw createApiServiceError(
      'Lob returned an unexpected PDF URL. Retrieve the mail piece again.'
    );
  }
  let expires = url.searchParams.get('expires');
  let expiresMs = expires && /^\d+$/.test(expires) ? Number(expires) * 1000 : undefined;
  let refreshMs =
    expiresMs !== undefined && Number.isFinite(expiresMs)
      ? expiresMs - REFRESH_MARGIN_MS
      : Date.now() + CONSERVATIVE_REFRESH_MS;
  if (refreshMs <= Date.now()) {
    throw createApiServiceError(
      'The PDF URL has expired or is about to expire. Retrieve the mail piece again.'
    );
  }
  let refreshAt = new Date(refreshMs);
  if (!Number.isFinite(refreshAt.getTime())) {
    throw createApiServiceError(
      'Lob returned an invalid PDF expiry. Retrieve the mail piece again.'
    );
  }
  return { url: url.toString(), expiresAt: refreshAt.toISOString() };
};

export let addMailPiecePreview = async (
  ctx: { addAttachment(input: SlateAddAttachmentInput): Promise<void> },
  resource: MailPiecePreview,
  mailPieceType: PreviewReference['mailPieceType']
) => {
  if (getPreviewState(resource) !== 'ready') return;
  let download = getPreviewDownload(resource);
  await ctx.addAttachment({
    type: 'url',
    url: download.url,
    mimeType: 'application/pdf',
    filename: `${resource.id}.pdf`,
    refreshReference: { mailPieceType, mailPieceId: resource.id },
    refreshAt: download.expiresAt
  });
};
