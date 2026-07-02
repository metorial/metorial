import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { codaServiceError } from '../lib/errors';
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
          description: z.string().optional().describe('Folder description'),
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
      description: folder.description,
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

export let getFolderTool = SlateTool.create(spec, {
  name: 'Get Folder',
  key: 'get_folder',
  description: `Retrieve details for a Coda folder, including workspace, description, editability, and browser link.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder to retrieve')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the folder'),
      name: z.string().describe('Name of the folder'),
      workspaceId: z.string().optional().describe('ID of the containing workspace'),
      workspaceName: z.string().optional().describe('Name of the containing workspace'),
      description: z.string().optional().describe('Folder description'),
      canEdit: z.boolean().optional().describe('Whether folder settings can be edited'),
      browserLink: z.string().optional().describe('URL to open the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let folder = await client.getFolder(ctx.input.folderId);

    return {
      output: {
        folderId: folder.id,
        name: folder.name,
        workspaceId: folder.workspace?.id,
        workspaceName: folder.workspace?.name,
        description: folder.description,
        canEdit: folder.canEdit,
        browserLink: folder.browserLink
      },
      message: `Retrieved folder **${folder.name}** (${folder.id}).`
    };
  })
  .build();

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in a Coda workspace.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new folder'),
      workspaceId: z
        .string()
        .describe('ID of the workspace where the folder should be created'),
      description: z.string().optional().describe('Description for the folder')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the created folder'),
      name: z.string().describe('Name of the created folder'),
      workspaceId: z.string().optional().describe('ID of the containing workspace'),
      description: z.string().optional().describe('Folder description'),
      browserLink: z.string().optional().describe('URL to open the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let folder = await client.createFolder({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      description: ctx.input.description
    });

    return {
      output: {
        folderId: folder.id,
        name: folder.name,
        workspaceId: folder.workspace?.id,
        description: folder.description,
        browserLink: folder.browserLink
      },
      message: `Created folder **${folder.name}**.`
    };
  })
  .build();

export let updateFolderTool = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Update an existing folder name or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder to update'),
      name: z.string().optional().describe('New name for the folder'),
      description: z.string().optional().describe('New description for the folder')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('ID of the updated folder'),
      name: z.string().optional().describe('Updated name of the folder'),
      description: z.string().optional().describe('Updated description of the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.name === undefined && ctx.input.description === undefined) {
      throw codaServiceError('Provide name or description to update the folder.');
    }

    await client.updateFolder(ctx.input.folderId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        folderId: ctx.input.folderId,
        name: ctx.input.name,
        description: ctx.input.description
      },
      message: `Updated folder **${ctx.input.folderId}**.`
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
