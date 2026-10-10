import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { TelegramClient } from '../../lib/client';
import { telegramFileAttachment } from '../../lib/files';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';

let referenceSchema = z.object({
  fileId: z.string().min(1),
  fileUniqueId: z.string().optional()
});

// Telegram groups stored files into folders by kind (photos/, videos/, voice/, ...).
let typeFor = (filePath: string) => {
  let kind = filePath.split('/')[0];
  if (kind === 'photos' || kind === 'stickers') return 'image' as const;
  if (kind === 'videos' || kind === 'video_notes' || kind === 'animations') {
    return 'video' as const;
  }
  if (kind === 'music' || kind === 'voice') return 'audio' as const;
  return 'file' as const;
};

// The file link embeds the bot token; it is hidden before storage and reissued from the file ID.
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

      let attachment = telegramFileAttachment(client, file);
      await ctx.addAttachment(attachment);
      let name = attachment.filename;

      return {
        output: {
          attachment: {
            type: typeFor(String(file.file_path)),
            id: file.file_id,
            name,
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
