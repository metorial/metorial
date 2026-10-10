import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { telegramFileAttachment } from '../lib/files';
import { spec } from '../spec';

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve file information for a file shared in Telegram and provide it as a downloadable file. Use the file_id from a received message.`,
  constraints: ['Maximum file size for download is 20 MB.'],
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

    if (file.file_path) await ctx.addAttachment(telegramFileAttachment(client, file));

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
