import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getFiles = SlateTool.create(spec, {
  name: 'Get Files',
  key: 'get_files',
  description: `Lists files in a chat room or retrieves details about a specific file including its download URL.`,
  constraints: [
    'Returns up to 100 files when listing.',
    'Download URLs are temporary and may expire.'
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

    if (ctx.input.fileId) {
      let file = await client.getRoomFile(ctx.input.roomId, ctx.input.fileId);
      return {
        output: {
          files: [
            {
              fileId: file.file_id,
              fileName: file.file_name,
              fileSize: file.file_size,
              uploaderAccountId: file.account.account_id,
              uploaderName: file.account.name,
              uploadTime: file.upload_time,
              downloadUrl: file.download_url
            }
          ]
        },
        message: `Retrieved file **${file.file_name}** (${file.file_size} bytes).`
      };
    } else {
      let files = await client.getRoomFiles(ctx.input.roomId);
      return {
        output: {
          files: files.map(f => ({
            fileId: f.file_id,
            fileName: f.file_name,
            fileSize: f.file_size,
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
