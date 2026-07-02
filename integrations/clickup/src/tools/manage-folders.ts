import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getFolders = SlateTool.create(spec, {
  name: 'Get Folders',
  key: 'get_folders',
  description: `Retrieve all folders in a ClickUp space.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to get folders from'),
      archived: z.boolean().optional().describe('Include archived folders')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string(),
          folderName: z.string(),
          taskCount: z.string().optional(),
          listCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let folders = await client.getFolders(ctx.input.spaceId, ctx.input.archived);

    return {
      output: {
        folders: folders.map((f: any) => ({
          folderId: f.id,
          folderName: f.name,
          taskCount: f.task_count,
          listCount: f.lists?.length
        }))
      },
      message: `Found **${folders.length}** folder(s) in space ${ctx.input.spaceId}.`
    };
  })
  .build();

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in a ClickUp space.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to create the folder in'),
      name: z.string().describe('Name for the new folder')
    })
  )
  .output(
    z.object({
      folderId: z.string(),
      folderName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let folder = await client.createFolder(ctx.input.spaceId, { name: ctx.input.name });

    return {
      output: {
        folderId: folder.id,
        folderName: folder.name
      },
      message: `Created folder **${folder.name}** (${folder.id}).`
    };
  })
  .build();

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Update the name of a ClickUp folder.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('The folder ID to update'),
      name: z.string().describe('New name for the folder')
    })
  )
  .output(
    z.object({
      folderId: z.string(),
      folderName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let folder = await client.updateFolder(ctx.input.folderId, { name: ctx.input.name });

    return {
      output: {
        folderId: folder.id,
        folderName: folder.name
      },
      message: `Updated folder **${folder.name}** (${folder.id}).`
    };
  })
  .build();

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Permanently delete a ClickUp folder and all its lists. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('The folder ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteFolder(ctx.input.folderId);

    return {
      output: { deleted: true },
      message: `Deleted folder ${ctx.input.folderId}.`
    };
  })
  .build();
