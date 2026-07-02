import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let manageFile = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description: `Perform file management operations on a Gigasheet file or folder. Supports renaming, copying, moving, deleting, and combining files.`
})
  .input(
    z.object({
      action: z
        .enum(['rename', 'copy', 'move', 'delete', 'combine'])
        .describe('The file management action to perform'),
      sheetHandle: z
        .string()
        .optional()
        .describe(
          'Handle of the file to operate on (required for rename, copy, move, delete)'
        ),
      newName: z.string().optional().describe('New name for rename or copy operations'),
      targetFolderHandle: z
        .string()
        .optional()
        .describe('Target folder handle for move or copy operations'),
      combineHandles: z
        .array(z.string())
        .optional()
        .describe('Array of sheet handles to combine (for combine action)')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Operation result details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown> | undefined;

    switch (ctx.input.action) {
      case 'rename':
        if (!ctx.input.sheetHandle || !ctx.input.newName) {
          throw new Error('sheetHandle and newName are required for rename');
        }
        result = await client.renameFile(ctx.input.sheetHandle, ctx.input.newName);
        break;

      case 'copy':
        if (!ctx.input.sheetHandle) {
          throw new Error('sheetHandle is required for copy');
        }
        result = await client.copyFile(ctx.input.sheetHandle, {
          name: ctx.input.newName,
          parentHandle: ctx.input.targetFolderHandle
        });
        break;

      case 'move':
        if (!ctx.input.sheetHandle || !ctx.input.targetFolderHandle) {
          throw new Error('sheetHandle and targetFolderHandle are required for move');
        }
        result = await client.moveFile(ctx.input.sheetHandle, ctx.input.targetFolderHandle);
        break;

      case 'delete':
        if (!ctx.input.sheetHandle) {
          throw new Error('sheetHandle is required for delete');
        }
        await client.deleteFile(ctx.input.sheetHandle);
        break;

      case 'combine':
        if (!ctx.input.combineHandles || ctx.input.combineHandles.length < 2) {
          throw new Error('combineHandles with at least 2 handles is required for combine');
        }
        result = await client.combineFiles(ctx.input.combineHandles, {
          name: ctx.input.newName,
          parentHandle: ctx.input.targetFolderHandle
        });
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Successfully performed **${ctx.input.action}** on file.`
    };
  })
  .build();
