import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all template folders in your workspace. Folders are used to organize templates into categories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      permission: z
        .enum(['manage', 'read', 'write'])
        .optional()
        .describe('Filter folders by permission level')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.number().describe('Unique folder ID'),
          name: z.string().describe('Folder name'),
          createdTime: z.string().nullable().describe('Creation timestamp'),
          updatedTime: z.string().nullable().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let folders = await client.listFolders({
      permission: ctx.input.permission
    });

    return {
      output: {
        folders: folders.map(f => ({
          folderId: f.id,
          name: f.name,
          createdTime: f.created_time,
          updatedTime: f.updated_time
        }))
      },
      message: `Found **${folders.length}** folder(s).`
    };
  })
  .build();

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder to organize templates. Templates can then be moved into the folder.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new folder')
    })
  )
  .output(
    z.object({
      folderId: z.number().describe('ID of the newly created folder'),
      name: z.string().describe('Folder name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let folder = await client.createFolder(ctx.input.name);

    return {
      output: {
        folderId: folder.id,
        name: folder.name
      },
      message: `Created folder **"${folder.name}"** (ID: ${folder.id}).`
    };
  })
  .build();

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Rename an existing folder.`
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the folder to update'),
      name: z.string().describe('New name for the folder')
    })
  )
  .output(
    z.object({
      folderId: z.number().describe('ID of the updated folder'),
      name: z.string().describe('Updated folder name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let folder = await client.updateFolder(ctx.input.folderId, ctx.input.name);

    return {
      output: {
        folderId: folder.id,
        name: folder.name
      },
      message: `Renamed folder to **"${folder.name}"** (ID: ${folder.id}).`
    };
  })
  .build();

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Delete a folder. Templates inside the folder will be automatically moved to the Home folder.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the folder to delete')
    })
  )
  .output(
    z.object({
      folderId: z.number().describe('ID of the deleted folder'),
      deleted: z.boolean().describe('Whether the folder was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.deleteFolder(ctx.input.folderId);

    return {
      output: {
        folderId: ctx.input.folderId,
        deleted: true
      },
      message: `Deleted folder (ID: ${ctx.input.folderId}). Any templates in the folder have been moved to Home.`
    };
  })
  .build();
