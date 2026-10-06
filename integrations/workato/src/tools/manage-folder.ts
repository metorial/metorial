import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { idNumber, malformed, numericId, records, required } from '../lib/validation';
import { spec } from '../spec';

export let manageFolderTool = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, update, or delete folders within a Workato workspace. Folders organize recipes and connections within projects. Also supports listing folders within a parent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      folderId: z.string().optional().describe('Folder ID (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)'),
      parentId: z.string().optional().describe('Parent folder ID'),
      force: z.boolean().optional().describe('Force delete non-empty folder'),
      page: z.number().optional().describe('Page number for list (default: 1)'),
      perPage: z.number().optional().describe('Results per page for list (max: 100)')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      folderId: z.number().optional().describe('ID of the created/affected folder'),
      folders: z
        .array(
          z.object({
            folderId: z.number().optional().describe('Folder ID'),
            name: z.string().optional().describe('Folder name'),
            parentId: z.number().nullable().optional().describe('Parent folder ID'),
            projectId: z
              .number()
              .nullable()
              .optional()
              .describe('Project ID this folder belongs to'),
            isProject: z.boolean().optional().describe('Whether this folder is a project root')
          })
        )
        .optional()
        .describe('List of folders (only for list action)')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const { action, folderId, name, parentId, force, page, perPage } = ctx.input;
    if (action === 'list') {
      const result = await client.listFolders({ parentId, page, perPage });
      const folders = records(result.items).map(map.folder);
      return {
        output: { success: true, folders },
        message: `Returned ${folders.length} folders from this page.`
      };
    }
    if (action === 'create') {
      const result = await client.createFolder(required(name, 'Folder name'), parentId);
      return {
        output: { success: true, folderId: idNumber(result.id) },
        message: 'Created folder.'
      };
    }
    const id = numericId(folderId, 'folderId');
    if (action === 'update') {
      const result = await client.updateFolder(id, { name, parentId });
      if (String(idNumber(result.id)) !== id) malformed();
    } else await client.deleteFolder(id, force);
    return {
      output: { success: true, folderId: idNumber(id) },
      message: `Folder ${action} accepted for ${id}. Force deletion removes all contents.`
    };
  });
