import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
      success: z.boolean().describe('Whether the operation succeeded'),
      folderId: z.number().optional().describe('ID of the created/affected folder'),
      folders: z
        .array(
          z.object({
            folderId: z.number().describe('Folder ID'),
            name: z.string().describe('Folder name'),
            parentId: z.number().nullable().describe('Parent folder ID'),
            projectId: z.number().nullable().describe('Project ID this folder belongs to'),
            isProject: z.boolean().describe('Whether this folder is a project root')
          })
        )
        .optional()
        .describe('List of folders (only for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, folderId, name, parentId, force, page, perPage } = ctx.input;

    if (action === 'list') {
      let result = await client.listFolders({ parentId, page, perPage });
      let items = Array.isArray(result) ? result : (result.items ?? []);
      let folders = items.map((f: any) => ({
        folderId: f.id,
        name: f.name,
        parentId: f.parent_id ?? null,
        projectId: f.project_id ?? null,
        isProject: f.is_project ?? false
      }));
      return {
        output: { success: true, folders },
        message: `Found **${folders.length}** folders.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a folder');
      let result = await client.createFolder(name, parentId);
      return {
        output: { success: true, folderId: result.id },
        message: `Created folder **${name}** with ID ${result.id}.`
      };
    }

    if (!folderId) throw new Error('Folder ID is required for update/delete');

    if (action === 'update') {
      await client.updateFolder(folderId, { name, parentId });
      return {
        output: { success: true, folderId: Number(folderId) },
        message: `Updated folder **${folderId}**.`
      };
    }

    // delete
    await client.deleteFolder(folderId, force);
    return {
      output: { success: true, folderId: Number(folderId) },
      message: `Deleted folder **${folderId}**.`
    };
  });
