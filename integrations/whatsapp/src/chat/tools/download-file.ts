import {
  type AttachmentRef,
  attachmentTypeForMime,
  downloadFile as contract
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createWhatsAppChatClient, toMediaFileSize } from '../lib/client';
import { parseWhatsAppFileReference, resolveWhatsAppMediaUrl } from '../lib/media';

export let chatDownloadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { mediaId } = parseWhatsAppFileReference(ctx.input.providerFileReference, action);
    let client = createWhatsAppChatClient(ctx);
    let { media, url, expiresAt } = await resolveWhatsAppMediaUrl(client, mediaId, action);

    // The media URL needs the token and expires; the media ID is the durable reference.
    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType: media.mime_type,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      refreshReference: { mediaId },
      refreshAt: expiresAt
    });

    let attachment: AttachmentRef = {
      type: attachmentTypeForMime(media.mime_type),
      id: mediaId,
      mimeType: media.mime_type,
      size: toMediaFileSize(media.file_size),
      status: 'complete',
      providerFileReference: { mediaId },
      raw: {
        id: media.id,
        mime_type: media.mime_type,
        sha256: media.sha256,
        file_size: media.file_size
      }
    };

    return {
      output: { attachment, raw: attachment.raw },
      message: `Prepared WhatsApp media \`${mediaId}\` for download.`
    };
  })
  .build();
