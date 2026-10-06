import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { nativeId, reject, text } from '../lib/contracts';
import { spec } from '../spec';

export let manageFile = SlateTool.create(spec, {
  name: 'Manage File',
  key: 'manage_file',
  description: `Copy, move, or delete a file or folder. For copy and move, specify the destination path. Delete supports recursive deletion for non-empty folders.`,
  instructions: [
    'Paths should not have leading or trailing slashes.',
    'For copy and move, the destination is the full new path including the filename.',
    'Use recursive delete carefully - it permanently removes the folder and all its contents.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['copy', 'move', 'delete']).describe('Action to perform'),
      path: z.string().describe('Source file or folder path'),
      destination: z
        .string()
        .optional()
        .describe('Destination path (required for copy and move)'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Overwrite existing file at destination (default false)'),
      recursive: z
        .boolean()
        .optional()
        .describe('For delete: recursively delete folder contents (default false)'),
      structure: z
        .boolean()
        .optional()
        .describe(
          'For copy: copy only the folder structure, not file contents (default false)'
        )
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'True only for native successful completion; pending operations return false'
        ),
      status: z.string().optional().describe('Native operation status'),
      fileMigrationId: z
        .number()
        .optional()
        .describe('Pending operation ID for get_file_operation'),
      path: z.string().optional().describe('Path of the resulting file/folder'),
      type: z.string().optional().describe('"file" or "directory"')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let { action, path, destination, overwrite, recursive, structure } = ctx.input;

    if (action === 'copy') {
      if (!destination) reject('Destination is required for copy action');
      let result = await client.copyFile(path, destination, { overwrite, structure });
      return {
        output: {
          success: result.status === 'success',
          status: text(result.status),
          fileMigrationId:
            result.file_migration_id === undefined || result.file_migration_id === null
              ? undefined
              : nativeId(result.file_migration_id),
          path: undefined,
          type: undefined
        },
        message: `Files.com copy status: ${text(result.status)}. Follow a pending operation with get_file_operation.`
      };
    }

    if (action === 'move') {
      if (!destination) reject('Destination is required for move action');
      let result = await client.moveFile(path, destination, { overwrite });
      return {
        output: {
          success: result.status === 'success',
          status: text(result.status),
          fileMigrationId:
            result.file_migration_id === undefined || result.file_migration_id === null
              ? undefined
              : nativeId(result.file_migration_id),
          path: undefined,
          type: undefined
        },
        message: `Files.com move status: ${text(result.status)}. Follow a pending operation with get_file_operation.`
      };
    }

    // delete
    await client.deleteFile(path, { recursive });
    return {
      output: {
        success: true,
        path: undefined,
        type: undefined
      },
      message: `Deleted \`${path}\`${recursive ? ' (recursive)' : ''}`
    };
  })
  .build();
