import { Buffer } from 'node:buffer';
import { type AttachmentRef, ChatErrors, uploadFile as contract } from '@slates/adapter-chat';
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

// Supported media types and limits. WebP goes out as a document: Meta only accepts it as a
// 512x512 sticker, which ordinary images are not.
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

/**
 * Shape C upload: WhatsApp has no way to attach a file to a separate text
 * message, so uploading stores the media and immediately sends it to the
 * conversation as its own media message.
 */
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

    let response: Response;
    try {
      response = await fetch(ctx.input.fileUrl);
    } catch (error) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        message: 'Could not fetch the file from its signed upload URL.',
        cause: error
      });
    }
    if (!response.ok) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        message: `Could not fetch the file from its signed upload URL: HTTP ${response.status}.`
      });
    }

    let declaredLength = Number(response.headers.get('content-length'));
    let { maxBytes: sourceLimit } =
      MEDIA_KINDS[declaredMime ?? baseMimeType(response.headers.get('content-type')) ?? ''] ??
      DOCUMENT;
    if (Number.isFinite(declaredLength) && declaredLength > sourceLimit) {
      throw ChatErrors.attachmentTooLarge({
        action,
        max: sourceLimit,
        actual: declaredLength
      });
    }

    let content = Buffer.from(await response.arrayBuffer());
    let mimeType =
      declaredMime ??
      baseMimeType(response.headers.get('content-type')) ??
      'application/octet-stream';
    let { kind, maxBytes } = MEDIA_KINDS[mimeType] ?? DOCUMENT;
    if (content.byteLength > maxBytes) {
      throw ChatErrors.attachmentTooLarge({
        action,
        max: maxBytes,
        actual: content.byteLength
      });
    }

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
      // When WhatsApp rejected the send, nothing references the stored media; remove
      // it so a retry does not leave orphaned uploads (media IDs otherwise last 30
      // days). After a timeout or network failure the message may still have been
      // delivered, so the media is kept.
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
