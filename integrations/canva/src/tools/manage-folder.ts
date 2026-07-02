import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let folderOutputSchema = z.object({
  folderId: z.string().describe('The folder ID'),
  name: z.string().describe('Folder name'),
  createdAt: z.number().describe('Unix timestamp of creation'),
  updatedAt: z.number().describe('Unix timestamp of last modification'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL (expires after 15 minutes)')
});

export let getFolder = SlateTool.create(spec, {
  name: 'Get Folder',
  key: 'get_folder',
  description: `Retrieve metadata for a specific folder in the user's Canva projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .describe(
          'The folder ID. Use "root" for top-level projects, "uploads" for the Uploads folder.'
        )
    })
  )
  .output(folderOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let folder = await client.getFolder(ctx.input.folderId);

    return {
      output: folder,
      message: `Retrieved folder **${folder.name}** (ID: ${folder.folderId}).`
    };
  })
  .build();

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in the user's Canva projects. Folders can be nested within other folders.`
})
  .input(
    z.object({
      name: z.string().min(1).max(255).describe('Folder name (1-255 characters)'),
      parentFolderId: z
        .string()
        .describe(
          'Parent folder ID. Use "root" for top-level projects, "uploads" for Uploads folder.'
        )
    })
  )
  .output(folderOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let folder = await client.createFolder({
      name: ctx.input.name,
      parentFolderId: ctx.input.parentFolderId
    });

    return {
      output: folder,
      message: `Created folder **${folder.name}** (ID: ${folder.folderId}).`
    };
  })
  .build();

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Rename a folder in the user's Canva projects.`
})
  .input(
    z.object({
      folderId: z.string().describe('The folder ID to update'),
      name: z.string().min(1).max(255).describe('New folder name (1-255 characters)')
    })
  )
  .output(folderOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let folder = await client.updateFolder(ctx.input.folderId, {
      name: ctx.input.name
    });

    return {
      output: folder,
      message: `Renamed folder to **${folder.name}** (ID: ${folder.folderId}).`
    };
  })
  .build();

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Delete a folder from the user's Canva projects. Content owned by the user is moved to Trash; content owned by others is moved to the top level of the owner's projects.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFolder(ctx.input.folderId);

    return {
      output: { deleted: true },
      message: `Deleted folder ${ctx.input.folderId}. Contents have been moved to Trash.`
    };
  })
  .build();

export let listFolderItems = SlateTool.create(spec, {
  name: 'List Folder Items',
  key: 'list_folder_items',
  description: `List the contents of a folder including designs, sub-folders, and images. Supports filtering by item type and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('The folder ID. Use "root" for top-level projects.'),
      itemTypes: z
        .array(z.enum(['design', 'folder', 'image']))
        .optional()
        .describe('Filter by item types'),
      sortBy: z
        .enum([
          'created_ascending',
          'created_descending',
          'modified_ascending',
          'modified_descending',
          'title_ascending',
          'title_descending'
        ])
        .optional()
        .describe('Sort order'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items per page (1-100, default 50)'),
      continuation: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            type: z.string().describe('Item type: "design", "folder", or "image"'),
            folder: folderOutputSchema
              .optional()
              .describe('Folder details (when type is "folder")'),
            design: z
              .object({
                designId: z.string(),
                title: z.string().optional(),
                editUrl: z.string().optional(),
                viewUrl: z.string().optional(),
                createdAt: z.number(),
                updatedAt: z.number(),
                thumbnailUrl: z.string().optional(),
                pageCount: z.number().optional()
              })
              .optional()
              .describe('Design details (when type is "design")'),
            image: z
              .object({
                assetId: z.string(),
                type: z.string(),
                name: z.string(),
                tags: z.array(z.string()),
                createdAt: z.number(),
                updatedAt: z.number(),
                ownerUserId: z.string(),
                ownerTeamId: z.string(),
                thumbnailUrl: z.string().optional()
              })
              .optional()
              .describe('Image asset details (when type is "image")')
          })
        )
        .describe('Items in the folder'),
      continuation: z.string().optional().describe('Token for retrieving the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listFolderItems(ctx.input.folderId, {
      itemTypes: ctx.input.itemTypes,
      sortBy: ctx.input.sortBy,
      limit: ctx.input.limit,
      continuation: ctx.input.continuation
    });

    return {
      output: result,
      message: `Found **${result.items.length}** items in folder.${result.continuation ? ' More items available.' : ''}`
    };
  })
  .build();

export let moveFolderItem = SlateTool.create(spec, {
  name: 'Move Folder Item',
  key: 'move_folder_item',
  description: `Move an item (design, folder, or image) to a different folder. Items that exist in multiple folders cannot be moved via the API.`,
  constraints: [
    'Video assets cannot be moved.',
    'Items in multiple folders must be moved via the Canva UI.'
  ]
})
  .input(
    z.object({
      itemId: z.string().describe('ID of the item to move (design, folder, or image asset)'),
      toFolderId: z
        .string()
        .describe('Destination folder ID. Use "root" for top-level projects.')
    })
  )
  .output(
    z.object({
      moved: z.boolean().describe('Whether the move was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.moveFolderItem({
      itemId: ctx.input.itemId,
      toFolderId: ctx.input.toFolderId
    });

    return {
      output: { moved: true },
      message: `Moved item ${ctx.input.itemId} to folder ${ctx.input.toFolderId}.`
    };
  })
  .build();
