import { createApiServiceError, type SlateAddAttachmentInput } from 'slates';
import { z } from 'zod';
import type { TelegramClient } from './client';

// Telegram keeps a file link valid for at least an hour; reissue it a few minutes early.
let FILE_URL_REFRESH_MS = 55 * 60 * 1000;

export let telegramFileReferenceSchema = z.object({ fileId: z.string().min(1) });

export let telegramFileRefreshAt = () =>
  new Date(Date.now() + FILE_URL_REFRESH_MS).toISOString();

export let getTelegramFilePath = async (client: TelegramClient, fileId: string) => {
  let file = await client.getFile(fileId);
  if (!file?.file_path) {
    throw createApiServiceError('Telegram did not return a download path for this file.');
  }
  return file as {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path: string;
  };
};

export let telegramFileAttachment = (
  client: TelegramClient,
  file: { file_id: string; file_path: string }
) =>
  ({
    type: 'url',
    url: client.getFileDownloadUrl(file.file_path),
    filename: file.file_path.split('/').pop() || file.file_id,
    refreshReference: { fileId: file.file_id },
    refreshAt: telegramFileRefreshAt()
  }) satisfies SlateAddAttachmentInput;
