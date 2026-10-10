import { ChatErrors } from '@slates/adapter-chat';
import {
  getOfficialWhatsAppMediaUrl,
  getWhatsAppMediaUrlExpiry,
  whatsappMediaReferenceSchema
} from '../../lib/media';
import type { WhatsAppChatClient } from './client';
import { withWhatsAppChatErrors } from './errors';

export let parseWhatsAppFileReference = (value: unknown, action: string) => {
  let parsed = whatsappMediaReferenceSchema.safeParse(value);
  if (!parsed.success) {
    throw ChatErrors.inputInvalid({
      action,
      message:
        'providerFileReference must be the { mediaId } reference from a WhatsApp message attachment.'
    });
  }
  return parsed.data;
};

export let resolveWhatsAppMediaUrl = async (
  client: WhatsAppChatClient,
  mediaId: string,
  action: string
) => {
  let media = await withWhatsAppChatErrors(
    {
      action,
      attachmentId: mediaId,
      // Expired or unknown media ID.
      ambiguous: {
        '100': 'chat.attachment.not_found',
        '131009': 'chat.attachment.not_found'
      }
    },
    () => client.getMedia(mediaId)
  );

  let url = getOfficialWhatsAppMediaUrl(media.url);
  if (!url) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      attachmentId: mediaId,
      message: 'WhatsApp did not return an official HTTPS media download URL.',
      retryable: false
    });
  }

  return { media, url, expiresAt: getWhatsAppMediaUrlExpiry() };
};
