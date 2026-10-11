import { createApiServiceError, getFileUrlTool } from 'slates';
import { TelegramClient } from '../lib/client';
import {
  getTelegramFilePath,
  telegramFileReferenceSchema,
  telegramFileRefreshAt
} from '../lib/files';
import { spec } from '../spec';

/** Reissues the hour-long Telegram file link from the durable file ID. */
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = telegramFileReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError('reference must be the { fileId } of a Telegram file.');
  }

  let client = new TelegramClient(ctx.auth.token);
  let file = await getTelegramFilePath(client, reference.data.fileId);
  return {
    url: client.getFileDownloadUrl(file.file_path),
    expiresAt: telegramFileRefreshAt()
  };
});
