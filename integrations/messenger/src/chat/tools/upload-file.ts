import { ChatErrors, uploadFile as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient, type MessengerUploadType } from '../lib/client';
import {
  type MessengerFileReference,
  mapMessengerPageAuthor,
  mapSentMessage,
  resolveMessengerChannel
} from '../lib/mappers';
import { assertMessengerPsid } from '../lib/validation';

/** Messenger accepts uploaded assets up to 25 MB (Attachment Upload API). */
let MESSENGER_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

let uploadTypeFor = (mimeType: string): MessengerUploadType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};

/**
 * Upload shape C: Messenger has no way to attach a file to a separate text
 * message, so sending the file creates its own message, returned alongside the
 * attachment.
 */
export let chatUploadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let input = ctx.input;

    if (input.threadId) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'thread_posts',
        message: 'Messenger conversations have no threads.'
      });
    }
    if (input.fileSize !== undefined && input.fileSize > MESSENGER_MAX_UPLOAD_BYTES) {
      throw ChatErrors.attachmentTooLarge({
        action,
        max: MESSENGER_MAX_UPLOAD_BYTES,
        actual: input.fileSize
      });
    }

    let client = createMessengerChatClient(ctx, action);
    assertMessengerPsid(client, input.channelId, action);

    let response: Response;
    try {
      response = await fetch(input.fileUrl);
    } catch (error) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        cause: error,
        message: 'Could not fetch the file from its signed upload URL.'
      });
    }
    if (!response.ok) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        message: `Could not fetch the file from its signed upload URL: HTTP ${response.status}.`
      });
    }

    let declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MESSENGER_MAX_UPLOAD_BYTES) {
      throw ChatErrors.attachmentTooLarge({
        action,
        max: MESSENGER_MAX_UPLOAD_BYTES,
        actual: declaredLength
      });
    }

    let content = await response.arrayBuffer();
    if (content.byteLength > MESSENGER_MAX_UPLOAD_BYTES) {
      throw ChatErrors.attachmentTooLarge({
        action,
        max: MESSENGER_MAX_UPLOAD_BYTES,
        actual: content.byteLength
      });
    }

    let mimeType =
      input.mimeType ||
      response.headers.get('content-type')?.split(';')[0]?.trim() ||
      'application/octet-stream';
    let type = uploadTypeFor(mimeType);

    let sent = await client.sendFile({
      recipientId: input.channelId,
      type,
      filename: input.filename,
      contentType: mimeType,
      content
    });

    if (!sent.message_id) {
      throw ChatErrors.providerError({
        action,
        message: 'Messenger accepted the file but did not return a message id.'
      });
    }

    let reference: MessengerFileReference = {
      messageId: sent.message_id,
      attachmentId: sent.attachment_id,
      index: 0,
      type
    };
    let attachment = {
      type,
      id: sent.attachment_id ?? `${sent.message_id}:0`,
      name: input.filename,
      mimeType,
      size: content.byteLength,
      status: 'complete' as const,
      providerFileReference: reference,
      clientReferenceId: input.clientReferenceId,
      raw: sent
    };

    let channel = await resolveMessengerChannel(client, input.channelId);
    let message = mapSentMessage({
      messageId: sent.message_id,
      channel,
      pageAuthor: mapMessengerPageAuthor(client.pageId),
      // A file message has no text; the body schema needs one part.
      parts: [{ type: 'text', content: '' }],
      attachments: [attachment],
      raw: sent
    });

    return {
      output: { attachment, message, channel, raw: sent },
      message: `Sent **${input.filename}** as Messenger message \`${sent.message_id}\`.`
    };
  })
  .build();
