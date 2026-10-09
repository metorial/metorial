import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve file information for a file shared in Telegram and provide it as a downloadable file. Use the file_id from a received message.`,
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
      filePath: z.string().optional().describe('File path on Telegram servers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    let file = await client.getFile(ctx.input.fileId);

    // Telegram's file URL embeds the bot token, so the bytes are fetched here instead of
    // returning the link. https://core.telegram.org/bots/api#getfile
    if (file.file_path) {
      let response = await client.downloadFile(file.file_path);
      if (!response.ok) {
        throw createApiServiceError(
          `Telegram responded with HTTP ${response.status} while downloading the file.`,
          { upstreamStatus: response.status }
        );
      }

      let mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();
      await ctx.addAttachment({
        type: 'content',
        content: response,
        filename: String(file.file_path).split('/').pop() || file.file_id,
        mimeType: mimeType === 'application/octet-stream' ? undefined : mimeType
      });
    }

    return {
      output: {
        fileId: file.file_id,
        fileUniqueId: file.file_unique_id,
        fileSize: file.file_size,
        filePath: file.file_path
      },
      message: `File info retrieved${file.file_path ? ' and prepared for download' : ''}. (${file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'unknown size'})`
    };
  })
  .build();
