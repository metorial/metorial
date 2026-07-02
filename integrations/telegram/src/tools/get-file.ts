import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve file information and a download URL for a file shared in Telegram. Use the file_id from a received message to get the download link.`,
  constraints: [
    'Files are available for download for at least 1 hour after the bot receives the file.',
    'Maximum file size for download is 20 MB.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z
        .string()
        .describe('File ID from a received message (e.g. from photo, document, audio, video)')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('File identifier'),
      fileUniqueId: z
        .string()
        .describe('Unique file identifier that stays the same over time'),
      fileSize: z.number().optional().describe('File size in bytes'),
      filePath: z.string().optional().describe('File path on Telegram servers'),
      downloadUrl: z.string().optional().describe('Direct URL to download the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let file = await client.getFile(ctx.input.fileId);
    let downloadUrl = file.file_path
      ? client.getFileDownloadUrl(ctx.auth.token, file.file_path)
      : undefined;

    return {
      output: {
        fileId: file.file_id,
        fileUniqueId: file.file_unique_id,
        fileSize: file.file_size,
        filePath: file.file_path,
        downloadUrl
      },
      message: `File info retrieved.${downloadUrl ? ` Download: ${downloadUrl}` : ''} (${file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'unknown size'})`
    };
  })
  .build();
