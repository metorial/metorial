import {
  attachmentTypeForMime,
  ChatErrors,
  uploadFile as contract,
  fetchAttachmentSource
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import {
  type MessengerFileReference,
  mapMessengerPageAuthor,
  mapSentMessage,
  resolveMessengerChannel
} from '../lib/mappers';
import { assertMessengerPsid } from '../lib/validation';

// Attachment Upload API limit.
let MESSENGER_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Messenger cannot attach a file to a text message, so the file is sent as its own message.
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

    let source = await fetchAttachmentSource(input.fileUrl, {
      action,
      maxBytes: MESSENGER_MAX_UPLOAD_BYTES
    });
    let content = source.bytes;

    let mimeType =
      input.mimeType ||
      source.contentType?.split(';')[0]?.trim() ||
      'application/octet-stream';
    let type = attachmentTypeForMime(mimeType);

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
