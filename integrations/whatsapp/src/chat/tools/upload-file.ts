import { Buffer } from 'node:buffer';
import {
  type AttachmentRef,
  ChatErrors,
  uploadFile as contract,
  fetchAttachmentSource
} from '@slates/adapter-chat';
import { SlateError } from 'slates';
import { spec } from '../../spec';
import { createWhatsAppChatClient } from '../lib/client';
import { mapWhatsAppChatError, withWhatsAppChatErrors } from '../lib/errors';
import { toWhatsAppRecipient, WHATSAPP_EMPTY_TEXT_PART } from '../lib/mappers';
import {
  assertNoWhatsAppThread,
  assertWhatsAppChannelId,
  buildWhatsAppSentMessage,
  getSentMessageId,
  getWhatsAppBusinessInfo
} from '../lib/outgoing';

type MediaKind = 'image' | 'video' | 'audio' | 'document';

let MB = 1024 * 1024;

// WebP is sent as a document; Meta accepts it only as a 512x512 sticker.
// https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media#supported-media-types
let MEDIA_KINDS: Record<string, { kind: MediaKind; maxBytes: number }> = {
  'image/jpeg': { kind: 'image', maxBytes: 5 * MB },
  'image/png': { kind: 'image', maxBytes: 5 * MB },
  'audio/aac': { kind: 'audio', maxBytes: 16 * MB },
  'audio/amr': { kind: 'audio', maxBytes: 16 * MB },
  'audio/mpeg': { kind: 'audio', maxBytes: 16 * MB },
  'audio/mp4': { kind: 'audio', maxBytes: 16 * MB },
  'audio/ogg': { kind: 'audio', maxBytes: 16 * MB },
  'video/mp4': { kind: 'video', maxBytes: 16 * MB },
  'video/3gpp': { kind: 'video', maxBytes: 16 * MB }
};
let DOCUMENT = { kind: 'document' as const, maxBytes: 100 * MB };

let ATTACHMENT_TYPES: Record<MediaKind, AttachmentRef['type']> = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  document: 'file'
};

let baseMimeType = (value: string | null | undefined) =>
  value?.split(';')[0]?.trim().toLowerCase() || undefined;

// Upload sends the media at once as its own message (shape C).
export let chatUploadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { channelId, filename, clientReferenceId } = ctx.input;
    assertNoWhatsAppThread(ctx.input.threadId, action);
    assertWhatsAppChannelId(channelId, action);

    let declaredMime = baseMimeType(ctx.input.mimeType);
    if (declaredMime && ctx.input.fileSize !== undefined) {
      let { maxBytes } = MEDIA_KINDS[declaredMime] ?? DOCUMENT;
      if (ctx.input.fileSize > maxBytes) {
        throw ChatErrors.attachmentTooLarge({
          action,
          max: maxBytes,
          actual: ctx.input.fileSize
        });
      }
    }

    let resolveMime = (contentType: string | undefined) =>
      declaredMime ?? baseMimeType(contentType) ?? 'application/octet-stream';
    let source = await fetchAttachmentSource(ctx.input.fileUrl, {
      action,
      maxBytes: contentType => (MEDIA_KINDS[resolveMime(contentType)] ?? DOCUMENT).maxBytes
    });
    let mimeType = resolveMime(source.contentType);
    let { kind } = MEDIA_KINDS[mimeType] ?? DOCUMENT;
    let content = Buffer.from(
      source.bytes.buffer,
      source.bytes.byteOffset,
      source.bytes.byteLength
    );

    let client = createWhatsAppChatClient(ctx);
    let uploaded = await withWhatsAppChatErrors(
      {
        action,
        channelId,
        ambiguous: {
          '100': 'chat.attachment.unsupported_type',
          '131009': 'chat.attachment.unsupported_type'
        }
      },
      () => client.uploadMedia({ content, filename, mimeType })
    );
    let mediaId = uploaded.id;
    if (!mediaId) {
      throw ChatErrors.attachmentUploadFailed({
        action,
        message: 'WhatsApp accepted the upload but did not return a media ID.'
      });
    }

    let sendResult: Awaited<ReturnType<typeof client.sendMessage>>;
    try {
      sendResult = await client.sendMessage(toWhatsAppRecipient(channelId), {
        type: kind,
        [kind]: kind === 'document' ? { id: mediaId, filename } : { id: mediaId }
      });
    } catch (error) {
      // Remove media only if the send was rejected; after a timeout it may have been delivered.
      let outcomeUnknown =
        SlateError.is(error) &&
        (error.code === 'upstream.timeout' || error.code === 'upstream.network_error');
      if (!outcomeUnknown) await client.deleteMedia(mediaId).catch(() => undefined);
      throw mapWhatsAppChatError(error, { action, channelId, attachmentId: mediaId });
    }

    let messageId = getSentMessageId(sendResult, action);
    let attachment: AttachmentRef = {
      type: ATTACHMENT_TYPES[kind],
      id: mediaId,
      name: filename,
      mimeType,
      size: content.byteLength,
      status: 'complete',
      providerFileReference: { mediaId },
      clientReferenceId,
      raw: { mediaId, kind }
    };

    let business = await getWhatsAppBusinessInfo(client);
    let result = buildWhatsAppSentMessage({
      client,
      channelId,
      messageId,
      body: { parts: [WHATSAPP_EMPTY_TEXT_PART], attachments: [attachment] },
      business,
      response: sendResult
    });

    return {
      output: {
        attachment,
        message: result.message,
        channel: result.channel,
        raw: { upload: uploaded, message: sendResult }
      },
      message: `Sent **${filename}** to WhatsApp conversation \`${channelId}\` as message \`${messageId}\`.`
    };
  })
  .build();
