import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
    destructive: false,
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
        .describe('Maximum number of folders to return (for "list" action).'),
      nextCursor: z.string().optional().describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            name: z.string().describe('Folder name.'),
            path: z.string().describe('Full folder path.')
          })
        )
        .optional()
        .describe('List of folders (for "list" action).'),
      nextCursor: z.string().optional().describe('Cursor for the next page.'),
      created: z
        .boolean()
        .optional()
        .describe('Whether the folder was created (for "create" action).'),
      deleted: z
        .array(z.string())
        .optional()
        .describe('Deleted folder paths (for "delete" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let result: any;
      if (ctx.input.path) {
        result = await client.listSubfolders(ctx.input.path, {
          maxResults: ctx.input.maxResults,
          nextCursor: ctx.input.nextCursor
        });
      } else {
        result = await client.listFolders({
          maxResults: ctx.input.maxResults,
          nextCursor: ctx.input.nextCursor
        });
      }

      return {
        output: {
          folders: result.folders.map((f: any) => ({ name: f.name, path: f.path })),
          nextCursor: result.nextCursor
        },
        message: `Listed **${result.folders.length}** folder(s)${ctx.input.path ? ` under "${ctx.input.path}"` : ' at root'}.${result.nextCursor ? ' More results available.' : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.path) throw new Error('Path is required to create a folder.');
      await client.createFolder(ctx.input.path);
      return {
        output: { created: true },
        message: `Created folder **${ctx.input.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.path) throw new Error('Path is required to delete a folder.');
      let result = await client.deleteFolder(ctx.input.path);
      return {
        output: { deleted: result.deleted },
        message: `Deleted folder **${ctx.input.path}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
