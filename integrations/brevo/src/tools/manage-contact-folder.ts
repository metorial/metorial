import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.number().describe('Folder ID'),
  name: z.string().describe('Folder name'),
  totalBlacklisted: z.number().optional().describe('Number of blacklisted contacts'),
  totalSubscribers: z.number().optional().describe('Total subscriber count'),
  uniqueSubscribers: z.number().optional().describe('Unique subscriber count')
});

let listOutputSchema = z.object({
  listId: z.number().describe('List ID'),
  name: z.string().describe('List name'),
  totalSubscribers: z.number().describe('Total subscriber count'),
  uniqueSubscribers: z.number().describe('Unique subscriber count'),
  folderId: z.number().describe('Associated folder ID')
});

let mapFolder = (folder: any) => ({
  folderId: folder.id,
  name: folder.name,
  totalBlacklisted: folder.totalBlacklisted,
  totalSubscribers: folder.totalSubscribers,
  uniqueSubscribers: folder.uniqueSubscribers
});

let mapList = (list: any) => ({
  listId: list.id,
  name: list.name,
  totalSubscribers: list.totalSubscribers ?? 0,
  uniqueSubscribers: list.uniqueSubscribers ?? 0,
  folderId: list.folderId
});

export let listContactFolders = SlateTool.create(spec, {
  name: 'List Contact Folders',
  key: 'list_contact_folders',
  description: `Retrieve Brevo contact folders. Folders organize contact lists and are required when creating new lists.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of folders per page'),
      offset: z.number().optional().describe('Index of the first folder')
    })
  )
  .output(
    z.object({
      folders: z.array(folderOutputSchema).describe('Contact folders'),
      count: z.number().describe('Total number of folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listFolders({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let folders = (result.folders ?? []).map(mapFolder);

    return {
      output: { folders, count: result.count },
      message: `Retrieved **${folders.length}** contact folders (${result.count} total).`
    };
  });

export let createContactFolder = SlateTool.create(spec, {
  name: 'Create Contact Folder',
  key: 'create_contact_folder',
  description: `Create a Brevo contact folder for organizing contact lists.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Folder name')
    })
  )
  .output(
    z.object({
      folderId: z.number().describe('ID of the newly created folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createFolder(ctx.input.name);

    return {
      output: result,
      message: `Contact folder **${ctx.input.name}** created. Folder ID: **${result.folderId}**`
    };
  });

export let getContactFolder = SlateTool.create(spec, {
  name: 'Get Contact Folder',
  key: 'get_contact_folder',
  description: `Retrieve details for a specific Brevo contact folder.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the contact folder to retrieve')
    })
  )
  .output(folderOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let folder = await client.getFolder(ctx.input.folderId);

    return {
      output: mapFolder(folder),
      message: `Retrieved contact folder **${folder.name}**.`
    };
  });

export let updateContactFolder = SlateTool.create(spec, {
  name: 'Update Contact Folder',
  key: 'update_contact_folder',
  description: `Rename a Brevo contact folder.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the contact folder to update'),
      name: z.string().describe('New folder name')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateFolder(ctx.input.folderId, ctx.input.name);

    return {
      output: { success: true },
      message: `Contact folder **${ctx.input.folderId}** updated successfully.`
    };
  });

export let deleteContactFolder = SlateTool.create(spec, {
  name: 'Delete Contact Folder',
  key: 'delete_contact_folder',
  description: `Delete a Brevo contact folder and all lists inside it. Contacts themselves are not deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the contact folder to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteFolder(ctx.input.folderId);

    return {
      output: { success: true },
      message: `Contact folder **${ctx.input.folderId}** deleted successfully.`
    };
  });

export let listContactListsInFolder = SlateTool.create(spec, {
  name: 'List Contact Lists in Folder',
  key: 'list_contact_lists_in_folder',
  description: `Retrieve the contact lists inside a specific Brevo folder.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the contact folder'),
      limit: z.number().optional().describe('Number of lists per page'),
      offset: z.number().optional().describe('Index of the first list'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order by creation date')
    })
  )
  .output(
    z.object({
      lists: z.array(listOutputSchema).describe('Contact lists in the folder'),
      count: z.number().describe('Total number of lists in the folder')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.limit !== undefined && ctx.input.limit < 0) {
      throw brevoServiceError('limit must be greater than or equal to 0.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.getListsInFolder({
      folderId: ctx.input.folderId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });
    let lists = (result.lists ?? []).map(mapList);

    return {
      output: { lists, count: result.count },
      message: `Retrieved **${lists.length}** lists from folder **${ctx.input.folderId}**.`
    };
  });
