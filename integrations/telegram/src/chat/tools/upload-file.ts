import { ChatErrors, uploadFile as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { getTelegramErrorDescription, withTelegramChatErrors } from '../lib/errors';
import { parseOptionalTelegramInteger } from '../lib/ids';
import { mapTelegramMessage, resolveTelegramBot } from '../lib/mappers';

// Multipart upload limits: 10 MB for photos, 50 MB for other files.
// https://core.telegram.org/bots/api#sending-files
let MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
let MAX_PHOTO_BYTES = 10 * 1024 * 1024;
let SOURCE_TIMEOUT_MS = 120_000;

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

/**
 * Photos, MP4 video, and MP3/M4A audio display inline in Telegram clients; every
 * other file is sent as a document, which keeps the original bytes and filename.
 */
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

let tooLarge = (action: string, actual: number, filename: string) =>
  ChatErrors.attachmentTooLarge({
    action,
    id: filename,
    max: MAX_UPLOAD_BYTES,
    actual,
    message: 'Telegram bots can upload files up to 50 MB.'
  });

let fetchSource = async (fileUrl: string, filename: string, action: string) => {
  let url = new URL(fileUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw ChatErrors.inputInvalid({
      action,
      message: 'fileUrl must be an HTTP(S) URL.',
      issues: [{ path: ['fileUrl'], code: 'invalid_url', message: 'Expected http or https' }]
    });
  }

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
  } catch (error) {
    throw ChatErrors.attachmentUploadFailed({
      action,
      attachmentId: filename,
      message: 'The file could not be fetched from its source URL.',
      cause: error
    });
  }
  if (!response.ok) {
    throw ChatErrors.attachmentUploadFailed({
      action,
      attachmentId: filename,
      message: `The file source URL responded with HTTP ${response.status}.`
    });
  }

  let declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES) {
    throw tooLarge(action, declared, filename);
  }

  let blob = await response.blob();
  if (blob.size > MAX_UPLOAD_BYTES) throw tooLarge(action, blob.size, filename);
  return { blob, contentType: response.headers.get('content-type') ?? undefined };
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
          // Photos with unsupported dimensions or ratios are still deliverable as documents.
          let description = getTelegramErrorDescription(error) ?? '';
          if (
            method.method !== 'sendPhoto' ||
            !/photo_invalid|image_process_failed/i.test(description)
          ) {
            throw error;
          }
          sent = await upload({ method: 'sendDocument', field: 'document' });
        }

        // Sending a file creates a new message, so both the stored file and that
        // message are returned.
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
