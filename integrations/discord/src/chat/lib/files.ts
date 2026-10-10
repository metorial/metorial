import { ChatErrors, downloadUrlRefreshAt, signedUrlHexExpiry } from '@slates/adapter-chat';
import { z } from 'zod';
import type { DiscordChatClient } from './client';
import type { DiscordApiAttachment } from './types';

export let discordFileReferenceSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  attachmentId: z.string().min(1)
});

export type DiscordFileReference = z.infer<typeof discordFileReferenceSchema>;

let ALLOWED_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);
// URLs without an `ex` signature are reissued hourly.
let FALLBACK_TTL_MS = 60 * 60 * 1000;

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

export let resolveDiscordAttachment = async (
  client: DiscordChatClient,
  reference: DiscordFileReference,
  action: string
): Promise<{ attachment: DiscordApiAttachment; url: string; refreshAt: string }> => {
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

  // https://docs.discord.com/developers/reference#signed-attachment-cdn-urls
  let expiresAt = signedUrlHexExpiry(attachment.url, 'ex');
  return {
    attachment,
    url: attachment.url,
    refreshAt: downloadUrlRefreshAt(expiresAt ?? new Date(Date.now() + FALLBACK_TTL_MS))
  };
};
