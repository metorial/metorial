import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List and search folders in your organization. Folders are used to organize projects within the Stack AI platform.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter folders by name'),
      limit: z.number().optional().describe('Maximum number of folders to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      folders: z.array(z.record(z.string(), z.unknown())).describe('List of folder objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let folders = await client.listFolders({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { folders },
      message: `Retrieved **${folders.length}** folder(s).`
    };
  })
  .build();

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, update, or delete a folder. Use this to organize your projects within the Stack AI platform.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      folderId: z
        .string()
        .optional()
        .describe('The folder ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Folder name (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      folder: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The created or updated folder (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the folder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('Name is required for creating a folder');
      }
      let folder = await client.createFolder(ctx.input.name);
      return {
        output: { folder },
        message: `Created folder **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.folderId) {
        throw new Error('Folder ID is required for updating a folder');
      }
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      let folder = await client.updateFolder(ctx.input.folderId, updateData);
      return {
        output: { folder },
        message: `Updated folder **${ctx.input.folderId}**.`
      };
    }

    // delete
    if (!ctx.input.folderId) {
      throw new Error('Folder ID is required for deleting a folder');
    }
    await client.deleteFolder(ctx.input.folderId);
    return {
      output: { deleted: true },
      message: `Deleted folder **${ctx.input.folderId}**.`
    };
  })
  .build();
