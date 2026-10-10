import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';

let referenceSchema = z.object({
  fileId: z.string().min(1),
  fileUniqueId: z.string().optional()
});

let typeFor = (mimeType: string | undefined, filePath: string) => {
  let kind = mimeType?.split('/')[0] ?? filePath.split('/')[0];
  if (kind === 'image' || kind === 'photos' || kind === 'stickers') return 'image' as const;
  if (
    kind === 'video' ||
    kind === 'videos' ||
    kind === 'video_notes' ||
    kind === 'animations'
  ) {
    return 'video' as const;
  }
  if (kind === 'audio' || kind === 'music' || kind === 'voice') return 'audio' as const;
  return 'file' as const;
};

// The file URL embeds the bot token, so the bytes are delivered instead of the link.
export let chatDownloadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let reference = referenceSchema.safeParse(ctx.input.providerFileReference);
    if (!reference.success) {
      throw ChatErrors.inputInvalid({
        action,
        message:
          'providerFileReference must be the Telegram file reference from a message attachment.'
      });
    }
    let { fileId } = reference.data;

    return withTelegramChatErrors({ action, attachmentId: fileId }, async () => {
      let client = new TelegramClient(ctx.auth.token);
      let file = await client.getFile(fileId);
      if (!file?.file_path) {
        throw ChatErrors.attachmentDownloadFailed({
          action,
          attachmentId: fileId,
          message: 'Telegram did not return a download path for this file.'
        });
      }

      let response: Response;
      try {
        response = await client.downloadFile(file.file_path);
      } catch (error) {
        throw ChatErrors.attachmentDownloadFailed({
          action,
          attachmentId: fileId,
          cause: error
        });
      }
      if (!response.ok) {
        throw ChatErrors.attachmentDownloadFailed({
          action,
          attachmentId: fileId,
          message: `Telegram responded with HTTP ${response.status} while downloading the file.`
        });
      }

      let name = String(file.file_path).split('/').pop() || fileId;
      let mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
      if (mimeType === 'application/octet-stream') mimeType = undefined;

      await ctx.addAttachment({
        type: 'content',
        content: response,
        filename: name,
        mimeType
      });

      return {
        output: {
          attachment: {
            type: typeFor(mimeType, String(file.file_path)),
            id: file.file_id,
            name,
            mimeType,
            size: file.file_size,
            status: 'complete' as const,
            providerFileReference: { fileId: file.file_id, fileUniqueId: file.file_unique_id },
            raw: {
              fileId: file.file_id,
              fileUniqueId: file.file_unique_id,
              fileSize: file.file_size,
              filePath: file.file_path
            }
          },
          raw: { fileId: file.file_id, fileUniqueId: file.file_unique_id }
        },
        message: `Prepared **${name}** for download.`
      };
    });
  })
  .build();
