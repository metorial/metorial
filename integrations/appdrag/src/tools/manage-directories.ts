import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let manageDirectories = SlateTool.create(spec, {
  name: 'Manage Directories',
  key: 'manage_directories',
  description: `Manage directories in the AppDrag Cloud Backend file storage. Supports creating, listing, renaming, and deleting directories.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'rename', 'delete'])
        .describe('The directory operation to perform.'),
      directoryPath: z
        .string()
        .describe('The directory path. For rename, this is the source directory.'),
      destinationPath: z
        .string()
        .optional()
        .describe('New directory path (required for the "rename" action).')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Result of the directory operation. For "list", returns the files and subdirectories.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result: any;

    switch (ctx.input.action) {
      case 'create':
        result = await client.directoryCreate(ctx.input.directoryPath);
        break;

      case 'list':
        result = await client.directoryList(ctx.input.directoryPath);
        break;

      case 'rename':
        if (!ctx.input.destinationPath) {
          throw new Error('Destination path is required for the rename action.');
        }
        result = await client.directoryRename(
          ctx.input.directoryPath,
          ctx.input.destinationPath
        );
        break;

      case 'delete':
        result = await client.directoryDelete(ctx.input.directoryPath);
        break;
    }

    return {
      output: {
        result
      },
      message: `Directory **${ctx.input.action}** completed on \`${ctx.input.directoryPath}\`.`
    };
  })
  .build();
