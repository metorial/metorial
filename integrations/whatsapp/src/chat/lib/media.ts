import { ChatErrors } from '@slates/adapter-chat';
import { z } from 'zod';
import type { WhatsAppChatClient } from './client';
import { withWhatsAppChatErrors } from './errors';

// Media URLs expire after five minutes; refresh a little early.
// https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#get-media-url
let MEDIA_URL_REFRESH_MS = 4 * 60 * 1000;

let MEDIA_HOST_SUFFIXES = ['.fbsbx.com', '.facebook.com', '.fbcdn.net', '.whatsapp.net'];

export let whatsappFileReferenceSchema = z.object({
  mediaId: z.string().min(1)
});

export let parseWhatsAppFileReference = (value: unknown, action: string) => {
  let parsed = whatsappFileReferenceSchema.safeParse(value);
  if (!parsed.success) {
    throw ChatErrors.inputInvalid({
      action,
      message:
        'providerFileReference must be the { mediaId } reference from a WhatsApp message attachment.'
    });
  }
  return parsed.data;
};

/** Resolves a short-lived, bearer-authenticated download URL for a media ID. */
export let resolveWhatsAppMediaUrl = async (
  client: WhatsAppChatClient,
  mediaId: string,
  action: string
) => {
  let media = await withWhatsAppChatErrors(
    {
      action,
      attachmentId: mediaId,
      // Expired (7 days for inbound, 30 days for uploads) or unknown media IDs.
      ambiguous: {
        '100': 'chat.attachment.not_found',
        '131009': 'chat.attachment.not_found'
      }
    },
    () => client.getMedia(mediaId)
  );

  let url: URL | undefined;
  try {
    url = media.url ? new URL(media.url) : undefined;
  } catch {
    url = undefined;
  }
  if (
    !url ||
    url.protocol !== 'https:' ||
    !MEDIA_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix))
  ) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      attachmentId: mediaId,
      message: 'WhatsApp did not return an official HTTPS media download URL.',
      retryable: false
    });
  }

  return {
    media,
    url: url.toString(),
    expiresAt: new Date(Date.now() + MEDIA_URL_REFRESH_MS).toISOString()
  };
};
