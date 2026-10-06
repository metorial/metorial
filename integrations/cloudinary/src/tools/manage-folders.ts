import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { folderSchema } from '../lib/types';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let manageFolders = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `List, create, or delete asset folders in Cloudinary. Supports listing root folders, subfolders within a specific path, creating new folders, and deleting empty folders.`,
  instructions: [
    'To list root folders, use action "list" without specifying a path.',
    'To list subfolders, use action "list" with a folder path.',
    'Folders must be empty before they can be deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform on folders.'),
      path: z
        .string()
        .optional()
        .describe(
          'Folder path. For "list", specifies the parent folder (omit for root). For "create" and "delete", specifies the folder path.'
        ),
      maxResults: z
        .number()
        .optional()
        .describe(
          'Maximum folder count per page (1–500); the endpoint is limited to 2000 results.'
        ),
      nextCursor: z.string().optional().describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).optional(),
      nextCursor: z.string().optional(),
      created: z.boolean().optional(),
      path: z.string().optional(),
      deleted: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.action === 'list') {
      const result =
        ctx.input.path !== undefined
          ? await client.listSubfolders(ctx.input.path, {
              maxResults: ctx.input.maxResults,
              nextCursor: ctx.input.nextCursor
            })
          : await client.listFolders({
              maxResults: ctx.input.maxResults,
              nextCursor: ctx.input.nextCursor
            });
      return {
        output: { folders: result.folders, nextCursor: result.nextCursor },
        message: `Listed ${result.folders.length} folder(s).${result.nextCursor ? ' Continue with nextCursor.' : ''}`
      };
    }
    if (ctx.input.maxResults !== undefined || ctx.input.nextCursor !== undefined)
      fail('Paging options apply only to listing folders.');
    if (ctx.input.path === undefined) fail('path is required to create or delete a folder.');
    if (ctx.input.action === 'create') {
      const result = await client.createFolder(ctx.input.path);
      return {
        output: { created: true, path: result.path },
        message: `Cloudinary confirmed folder **${result.path}**.`
      };
    }
    const result = await client.deleteFolder(ctx.input.path);
    return {
      output: result,
      message: `Cloudinary confirmed deletion of folder **${ctx.input.path}**. Backup entries may prevent deletion.`
    };
  })
  .build();
