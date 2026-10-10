import { notFoundError, ServiceError } from '@lowerdeck/error';
import { createApiServiceError, getFileUrlTool } from 'slates';
import { createWhatsAppChatClient, type WhatsAppChatClient } from '../chat/lib/client';
import { getWhatsAppGraphErrorCode, toWhatsAppServiceError } from '../lib/graphErrors';
import {
  getOfficialWhatsAppMediaUrl,
  getWhatsAppMediaUrlExpiry,
  whatsappMediaReferenceSchema
} from '../lib/media';
import { spec } from '../spec';

// Graph codes for an expired or unknown media ID.
let MEDIA_NOT_FOUND_CODES = new Set(['100', '131009']);

let getMedia = async (client: WhatsAppChatClient, mediaId: string) => {
  try {
    return await client.getMedia(mediaId);
  } catch (error) {
    let upstreamCode = getWhatsAppGraphErrorCode(error);
    if (upstreamCode && MEDIA_NOT_FOUND_CODES.has(upstreamCode)) {
      let notFound = new ServiceError(
        notFoundError({
          entity: 'media',
          id: mediaId,
          message: 'The attachment does not exist or has been deleted.'
        })
      );
      notFound.data.upstreamCode = upstreamCode;
      if (error instanceof Error) notFound.setParent(error);
      throw notFound;
    }
    throw toWhatsAppServiceError(error, 'get media URL');
  }
};

/** Reissues the five-minute WhatsApp media URL from the durable media ID. */
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = whatsappMediaReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'reference must be the { mediaId } reference from a WhatsApp message attachment.'
    );
  }

  let { mediaId } = reference.data;
  let media = await getMedia(createWhatsAppChatClient(ctx), mediaId);
  let url = getOfficialWhatsAppMediaUrl(media.url);
  if (!url) {
    throw createApiServiceError(
      'WhatsApp did not return an official HTTPS media download URL.',
      { reason: 'whatsapp_media_url_invalid' }
    );
  }

  return {
    url,
    expiresAt: getWhatsAppMediaUrlExpiry(),
    headers: { Authorization: `Bearer ${ctx.auth.token}` }
  };
});
