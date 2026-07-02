import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let manageFiles = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `Manage files in the AppDrag Cloud Backend file storage. Supports writing text files, deleting files, renaming/moving files, copying files, and downloading remote files into storage.`,
  instructions: [
    'File paths (filekey) are relative to the project root, e.g., "uploads/data.json".',
    'When downloading a remote file, provide the full URL and the destination path in storage.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['write', 'delete', 'rename', 'copy', 'download_remote'])
        .describe('The file operation to perform.'),
      filePath: z
        .string()
        .describe(
          'The file path (filekey) in cloud storage. For rename/copy, this is the source path.'
        ),
      destinationPath: z
        .string()
        .optional()
        .describe('Destination path for rename, copy, or download_remote operations.'),
      content: z
        .string()
        .optional()
        .describe('Text content to write (required for the "write" action).'),
      remoteUrl: z
        .string()
        .optional()
        .describe(
          'Remote URL to download a file from (required for "download_remote" action).'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the file operation from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result: any;

    switch (ctx.input.action) {
      case 'write':
        if (!ctx.input.content) {
          throw new Error('Content is required for the write action.');
        }
        result = await client.fileTextWrite(ctx.input.filePath, ctx.input.content);
        break;

      case 'delete':
        result = await client.fileDelete(ctx.input.filePath);
        break;

      case 'rename':
        if (!ctx.input.destinationPath) {
          throw new Error('Destination path is required for the rename action.');
        }
        result = await client.fileRename(ctx.input.filePath, ctx.input.destinationPath);
        break;

      case 'copy':
        if (!ctx.input.destinationPath) {
          throw new Error('Destination path is required for the copy action.');
        }
        result = await client.fileCopy(ctx.input.filePath, ctx.input.destinationPath);
        break;

      case 'download_remote':
        if (!ctx.input.remoteUrl) {
          throw new Error('Remote URL is required for the download_remote action.');
        }
        result = await client.downloadRemoteFile(
          ctx.input.remoteUrl,
          ctx.input.destinationPath || ctx.input.filePath
        );
        break;
    }

    return {
      output: {
        result
      },
      message: `File operation **${ctx.input.action}** completed on \`${ctx.input.filePath}\`.`
    };
  })
  .build();
