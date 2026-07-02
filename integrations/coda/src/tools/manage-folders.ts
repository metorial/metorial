import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFoldersTool = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List folders accessible to the authenticated user. Optionally filter by workspace or starred status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter folders by workspace ID'),
      isStarred: z.boolean().optional().describe('Show only starred folders'),
      limit: z.number().optional().describe('Maximum number of folders to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.string().describe('ID of the folder'),
          name: z.string().describe('Name of the folder'),
          workspaceId: z.string().optional().describe('ID of the containing workspace'),
          browserLink: z.string().optional().describe('URL to open the folder')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFolders({
      workspaceId: ctx.input.workspaceId,
      isStarred: ctx.input.isStarred,
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let folders = (result.items || []).map((folder: any) => ({
      folderId: folder.id,
      name: folder.name,
      workspaceId: folder.workspace?.id,
      browserLink: folder.browserLink
    }));

    return {
      output: {
        folders,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${folders.length}** folder(s).`
    };
  })
  .build();

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in a workspace, optionally nested under a parent folder.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new folder'),
      parentFolderId: z.string().optional().describe('ID of the parent folder for nesting')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the created folder'),
      name: z.string().describe('Name of the created folder'),
      browserLink: z.string().optional().describe('URL to open the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.createFolder({
      name: ctx.input.name,
      parentFolderId: ctx.input.parentFolderId
    });

    return {
      output: {
        folderId: folder.id,
        name: folder.name,
        browserLink: folder.browserLink
      },
      message: `Created folder **${folder.name}**.`
    };
  })
  .build();

export let updateFolderTool = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Rename an existing folder.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder to update'),
      name: z.string().describe('New name for the folder')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the updated folder'),
      name: z.string().describe('Updated name of the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateFolder(ctx.input.folderId, {
      name: ctx.input.name
    });

    return {
      output: {
        folderId: ctx.input.folderId,
        name: ctx.input.name
      },
      message: `Updated folder **${ctx.input.folderId}** to **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteFolderTool = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Permanently delete a folder. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the folder was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteFolder(ctx.input.folderId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted folder **${ctx.input.folderId}**.`
    };
  })
  .build();
