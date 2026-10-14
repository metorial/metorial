import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFiles = SlateTool.create(spec, {
  name: 'Get Files',
  key: 'get_files',
  description: `Lists files in a chat room or prepares a specific file for download. Call list_rooms to discover room IDs.`,
  constraints: [
    'Returns up to 100 files when listing.',
    'Download URLs expire after 30 seconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      fileId: z
        .number()
        .optional()
        .describe(
          'Specific file ID to get details and download URL for. Omit to list all files.'
        ),
      uploaderAccountId: z
        .number()
        .optional()
        .describe(
          'Filter the file list by uploader account ID. Applies when fileId is omitted.'
        )
    })
  )
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.number().describe('File ID'),
          fileName: z.string().describe('File name'),
          fileSize: z.number().describe('File size in bytes'),
          uploaderAccountId: z.number().describe('Uploader account ID'),
          uploaderName: z.string().describe('Uploader display name'),
          uploadTime: z.number().describe('Upload time as Unix timestamp'),
          downloadUrl: z
            .string()
            .optional()
            .describe('Temporary download URL (only when fetching a specific file)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.fileId !== undefined) {
      let requestedAt = Date.now();
      let file = await client.getRoomFile(ctx.input.roomId, ctx.input.fileId);
      if (file.download_url) {
        await ctx.addAttachment({
          type: 'url',
          url: file.download_url,
          refreshReference: { roomId: ctx.input.roomId, fileId: ctx.input.fileId },
          // Chatwork URLs expire after 30 seconds; renew with a 10-second margin.
          refreshAt: new Date(requestedAt + 20_000).toISOString()
        });
      }
      return {
        output: {
          files: [
            {
              fileId: file.file_id,
              fileName: file.filename,
              fileSize: file.filesize,
              uploaderAccountId: file.account.account_id,
              uploaderName: file.account.name,
              uploadTime: file.upload_time,
              downloadUrl: file.download_url
            }
          ]
        },
        message: file.download_url
          ? `Prepared file **${file.filename}** (${file.filesize} bytes) for download.`
          : `Retrieved file **${file.filename}** (${file.filesize} bytes).`
      };
    } else {
      let files = await client.getRoomFiles(ctx.input.roomId, ctx.input.uploaderAccountId);
      return {
        output: {
          files: files.map(f => ({
            fileId: f.file_id,
            fileName: f.filename,
            fileSize: f.filesize,
            uploaderAccountId: f.account.account_id,
            uploaderName: f.account.name,
            uploadTime: f.upload_time
          }))
        },
        message: `Retrieved **${files.length}** files from room ${ctx.input.roomId}.`
      };
    }
  })
  .build();
