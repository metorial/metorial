import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(['default', 'mega']),
  accessLevel: z.enum(['read', 'write']).nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let manageFolders = SlateTool.create(spec, {
  name: 'Manage Folders',
  key: 'manage_folders',
  description:
    'List, create, rename, or delete folders used to organize short links. Deleting a folder keeps its links working and removes their folder association.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      folderId: z
        .string()
        .optional()
        .describe('Required for update and delete; discover IDs with list'),
      name: z
        .string()
        .max(190)
        .optional()
        .describe('Required for create; optional new name for update'),
      description: z
        .string()
        .max(500)
        .nullable()
        .optional()
        .describe('Folder description for create or update; null clears it'),
      search: z.string().optional().describe('Filter folder names for list'),
      page: z.number().int().min(1).optional().describe('Page number for list, starting at 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Folders per list page, at most 50')
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema).optional(),
      folder: folderSchema.optional(),
      deletedFolderId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let input = ctx.input;
    if (input.action === 'list') {
      let folders = await client.listFolders({
        search: input.search,
        page: input.page,
        pageSize: input.pageSize
      });
      return { output: { folders }, message: `Found **${folders.length}** folders` };
    }
    if (input.action === 'create') {
      if (!input.name?.trim())
        throw createApiServiceError('Provide a folder name to create a folder.');
      let folder = await client.createFolder({
        name: input.name,
        description: input.description
      });
      return { output: { folder }, message: `Created folder **${folder.name}**` };
    }
    if (!input.folderId?.trim())
      throw createApiServiceError(
        'Provide folderId for update or delete. List folders to find its ID.'
      );
    if (input.action === 'update') {
      if (input.name === undefined && input.description === undefined)
        throw createApiServiceError('Provide a name or description to update the folder.');
      let folder = await client.updateFolder(input.folderId, {
        name: input.name,
        description: input.description
      });
      return { output: { folder }, message: `Updated folder **${folder.name}**` };
    }
    let result = await client.deleteFolder(input.folderId);
    return {
      output: { deletedFolderId: result.id },
      message: `Deleted folder \`${result.id}\`; its links remain available`
    };
  })
  .build();
