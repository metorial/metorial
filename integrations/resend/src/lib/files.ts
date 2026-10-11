import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { AttachmentMetadata, Client } from './client';

// Resend download URLs are signed CDN links valid for about one hour.
// Renew them a few minutes before they lapse.
let DOWNLOAD_URL_LIFETIME_MS = 60 * 60 * 1000;
let REFRESH_MARGIN_MS = 5 * 60 * 1000;

export let resendFileReferenceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email_attachment'),
    source: z.enum(['sent', 'received']),
    emailId: z.string().min(1),
    attachmentId: z.string().min(1)
  }),
  z.object({
    type: z.literal('received_email_raw'),
    emailId: z.string().min(1)
  })
]);

export type ResendFileReference = z.infer<typeof resendFileReferenceSchema>;

export type ResendFileUrl = {
  url: string;
  refreshAt: string;
};

export let getRefreshAt = (expiresAt?: string | null) => {
  let expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAtMs)) {
    expiresAtMs = Date.now() + DOWNLOAD_URL_LIFETIME_MS;
  }

  return new Date(expiresAtMs - REFRESH_MARGIN_MS).toISOString();
};

let requireDownloadUrl = (url: unknown, label: string) => {
  if (typeof url !== 'string' || url.length === 0) {
    throw createApiServiceError(`Resend did not return a download URL for this ${label}.`);
  }

  return url;
};

export let getEmailAttachmentMetadata = async (
  client: Client,
  reference: Extract<ResendFileReference, { type: 'email_attachment' }>
): Promise<AttachmentMetadata & { download_url: string }> => {
  let metadata =
    reference.source === 'sent'
      ? await client.getEmailAttachment(reference.emailId, reference.attachmentId)
      : await client.getReceivedEmailAttachment(reference.emailId, reference.attachmentId);

  return {
    ...metadata,
    download_url: requireDownloadUrl(metadata.download_url, 'attachment')
  };
};

export let getRawEmailDownload = (email: {
  raw?: { download_url?: string; expires_at?: string } | null;
}): ResendFileUrl => ({
  url: requireDownloadUrl(email.raw?.download_url, 'received email'),
  refreshAt: getRefreshAt(email.raw?.expires_at)
});

export let resolveResendFileUrl = async (
  client: Client,
  reference: ResendFileReference
): Promise<ResendFileUrl> => {
  if (reference.type === 'email_attachment') {
    let metadata = await getEmailAttachmentMetadata(client, reference);
    return { url: metadata.download_url, refreshAt: getRefreshAt(metadata.expires_at) };
  }

  return getRawEmailDownload(await client.getReceivedEmail(reference.emailId));
};
