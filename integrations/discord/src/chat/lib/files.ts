import { ChatErrors } from '@slates/adapter-chat';
import { z } from 'zod';
import type { DiscordChatClient } from './client';
import type { DiscordApiAttachment } from './types';

export let discordFileReferenceSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  attachmentId: z.string().min(1)
});

let ALLOWED_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);
// Renew a little before Discord's signed URL expires.
let REFRESH_MARGIN_MS = 5 * 60 * 1000;

export let parseDiscordFileReference = (value: unknown, action: string) => {
  let parsed = discordFileReferenceSchema.safeParse(value);
  if (!parsed.success) {
    throw ChatErrors.inputInvalid({
      action,
      message:
        'providerFileReference must be a Discord attachment reference ({ channelId, messageId, attachmentId }).'
    });
  }
  return parsed.data;
};

/**
 * Attachment CDN URLs are signed and expire; `ex` is the hex expiry timestamp in seconds.
 * https://docs.discord.com/developers/reference#signed-attachment-cdn-urls
 */
export let signedUrlExpiry = (url: string): Date | undefined => {
  let ex = new URL(url).searchParams.get('ex');
  if (!ex) return undefined;
  let seconds = Number.parseInt(ex, 16);
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined;
};

/** Re-reads the owning message to obtain a fresh signed CDN URL for the attachment. */
export let resolveDiscordAttachment = async (
  client: DiscordChatClient,
  reference: z.infer<typeof discordFileReferenceSchema>,
  action: string
): Promise<{ attachment: DiscordApiAttachment; url: string; expiresAt?: Date }> => {
  let message = await client.getMessage(reference.channelId, reference.messageId);
  let attachment = message.attachments?.find(item => item.id === reference.attachmentId);
  if (!attachment?.url) {
    throw ChatErrors.attachmentNotFound({
      action,
      attachmentId: reference.attachmentId,
      message: 'The attachment is no longer on that Discord message.'
    });
  }

  let parsed = new URL(attachment.url);
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      attachmentId: reference.attachmentId,
      retryable: false,
      message: 'Discord returned a download URL outside its CDN.'
    });
  }

  return { attachment, url: attachment.url, expiresAt: signedUrlExpiry(attachment.url) };
};

export let refreshAtFor = (expiresAt: Date | undefined) =>
  expiresAt
    ? new Date(Math.max(Date.now(), expiresAt.getTime() - REFRESH_MARGIN_MS)).toISOString()
    : undefined;
