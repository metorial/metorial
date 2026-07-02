import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let folderSchema = z.object({
  folderId: z.string().describe('Unique identifier of the folder'),
  name: z.string().describe('Folder name'),
  parentFolderId: z.string().optional().describe('ID of the parent folder')
});

export let manageFoldersTool = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description: `List, create, update, or delete folders for organizing documents and templates. Provide exactly one action per call: set **action** to "list", "create", "update", or "delete".`,
  instructions: [
    'action=list: optionally pass query, page, perPage, parentFolderId to filter.',
    'action=create: name is required, parentFolderId is optional.',
    'action=update: folderId and name are required.',
    'action=delete: folderId is required. Deleting a folder is permanent.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The folder operation to perform'),
      folderId: z.string().optional().describe('Folder ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Parent folder ID (for create and list filtering)'),
      query: z.string().optional().describe('Search query for listing folders'),
      page: z.number().optional().describe('Page number for listing'),
      perPage: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).optional().describe('List of folders (for list action)'),
      folder: folderSchema.optional().describe('Created or updated folder'),
      deleted: z.boolean().optional().describe('Whether the folder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.findFolders({
        query: ctx.input.query,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        parentFolderId: ctx.input.parentFolderId
      });

      let items = Array.isArray(result) ? result : (result.data ?? result.folders ?? []);

      return {
        output: {
          folders: items.map((f: Record<string, unknown>) => ({
            folderId: String(f.id ?? f.folderId ?? ''),
            name: String(f.name ?? ''),
            parentFolderId: f.parentFolderId ? String(f.parentFolderId) : undefined
          }))
        },
        message: `Found ${items.length} folder(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let result = await client.createFolder({
        name: ctx.input.name,
        parentFolderId: ctx.input.parentFolderId
      });

      return {
        output: {
          folder: {
            folderId: String(result.id ?? result.folderId ?? ''),
            name: String(result.name ?? ctx.input.name),
            parentFolderId: ctx.input.parentFolderId
          }
        },
        message: `Created folder "${ctx.input.name}".`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.folderId) throw new Error('folderId is required for update action');
      await client.updateFolder(ctx.input.folderId, { name: ctx.input.name });

      return {
        output: {
          folder: {
            folderId: ctx.input.folderId,
            name: String(ctx.input.name ?? '')
          }
        },
        message: `Updated folder \`${ctx.input.folderId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.folderId) throw new Error('folderId is required for delete action');
      await client.deleteFolder(ctx.input.folderId);

      return {
        output: { deleted: true },
        message: `Deleted folder \`${ctx.input.folderId}\`.`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
