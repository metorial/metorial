import {
  ChatErrors,
  uploadFile as contract,
  fetchAttachmentSource
} from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { getTelegramErrorDescription, withTelegramChatErrors } from '../lib/errors';
import { parseOptionalTelegramInteger } from '../lib/ids';
import { mapTelegramMessage, resolveTelegramBot } from '../lib/mappers';

// https://core.telegram.org/bots/api#sending-files
let MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
let MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type UploadMethod = {
  method: 'sendDocument' | 'sendPhoto' | 'sendVideo' | 'sendAudio';
  field: 'document' | 'photo' | 'video' | 'audio';
};

let EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4'
};

let resolveMimeType = (filename: string, mimeType?: string) =>
  (mimeType ?? EXTENSION_TYPES[filename.split('.').pop()?.toLowerCase() ?? ''] ?? '')
    .split(';')[0]!
    .trim()
    .toLowerCase();

// Only these types display inline; anything else is sent as a document.
let chooseMethod = (mimeType: string, size: number): UploadMethod => {
  if ((mimeType === 'image/jpeg' || mimeType === 'image/png') && size <= MAX_PHOTO_BYTES) {
    return { method: 'sendPhoto', field: 'photo' };
  }
  if (mimeType === 'video/mp4') return { method: 'sendVideo', field: 'video' };
  if (mimeType === 'audio/mpeg' || mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') {
    return { method: 'sendAudio', field: 'audio' };
  }
  return { method: 'sendDocument', field: 'document' };
};

let TOO_LARGE_MESSAGE = 'Telegram bots can upload files up to 50 MB.';

let tooLarge = (action: string, actual: number, filename: string) =>
  ChatErrors.attachmentTooLarge({
    action,
    id: filename,
    max: MAX_UPLOAD_BYTES,
    actual,
    message: TOO_LARGE_MESSAGE
  });

let fetchSource = async (fileUrl: string, filename: string, action: string) => {
  let source = await fetchAttachmentSource(fileUrl, {
    action,
    attachmentId: filename,
    maxBytes: MAX_UPLOAD_BYTES,
    tooLargeMessage: TOO_LARGE_MESSAGE
  });
  let blob = new Blob([source.bytes], { type: source.contentType ?? '' });
  return { blob, contentType: source.contentType };
};

export let chatUploadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { channelId, threadId, filename, fileUrl, fileSize, clientReferenceId } = ctx.input;
    let messageThreadId = parseOptionalTelegramInteger(threadId, 'threadId', action);
    if (fileSize !== undefined && fileSize > MAX_UPLOAD_BYTES) {
      throw tooLarge(action, fileSize, filename);
    }

    let source = await fetchSource(fileUrl, filename, action);
    let mimeType = resolveMimeType(filename, ctx.input.mimeType ?? source.contentType);
    let method = chooseMethod(mimeType, source.blob.size);

    return withTelegramChatErrors(
      { action, channelId, threadId, attachmentId: filename },
      async () => {
        let client = new TelegramClient(ctx.auth.token);
        let bot = await resolveTelegramBot(client, ctx.auth);
        let upload = (target: UploadMethod) =>
          client.uploadFile({
            ...target,
            chatId: channelId,
            file: source.blob,
            filename,
            messageThreadId
          });
        let sent: any;
        try {
          sent = await upload(method);
        } catch (error) {
          // Photos with unsupported dimensions still send as documents.
          let description = getTelegramErrorDescription(error) ?? '';
          if (
            method.method !== 'sendPhoto' ||
            !/photo_invalid|image_process_failed/i.test(description)
          ) {
            throw error;
          }
          sent = await upload({ method: 'sendDocument', field: 'document' });
        }

        // The upload creates a message, so it is returned with the file.
        let mapped = mapTelegramMessage(sent, bot, {
          clientReferenceIds: [clientReferenceId]
        });
        let uploaded = mapped.message.body.attachments?.[0];
        if (!uploaded) {
          throw ChatErrors.attachmentUploadFailed({
            action,
            attachmentId: filename,
            message: 'Telegram did not return the uploaded file.'
          });
        }
        let attachment = {
          ...uploaded,
          name: uploaded.name ?? filename,
          mimeType: uploaded.mimeType ?? (mimeType || undefined),
          size: uploaded.size ?? source.blob.size
        };
        if (mapped.message.body.attachments) mapped.message.body.attachments[0] = attachment;

        return {
          output: {
            attachment,
            message: mapped.message,
            channel: mapped.channel,
            thread: mapped.thread,
            raw: sent
          },
          message: `Sent **${filename}** to the Telegram chat as message \`${mapped.message.id}\`.`
        };
      }
    );
  })
  .build();
