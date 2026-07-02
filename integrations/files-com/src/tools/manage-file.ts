import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
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
      success: z.boolean().describe('Whether the operation succeeded'),
      path: z.string().optional().describe('Path of the resulting file/folder'),
      type: z.string().optional().describe('"file" or "directory"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, path, destination, overwrite, recursive, structure } = ctx.input;

    if (action === 'copy') {
      if (!destination) throw new Error('Destination is required for copy action');
      let result = await client.copyFile(path, destination, { overwrite, structure });
      return {
        output: {
          success: true,
          path: String(result.path ?? destination),
          type: result.type ? String(result.type) : undefined
        },
        message: `Copied \`${path}\` to \`${destination}\``
      };
    }

    if (action === 'move') {
      if (!destination) throw new Error('Destination is required for move action');
      let result = await client.moveFile(path, destination, { overwrite });
      return {
        output: {
          success: true,
          path: String(result.path ?? destination),
          type: result.type ? String(result.type) : undefined
        },
        message: `Moved \`${path}\` to \`${destination}\``
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
