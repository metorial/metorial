import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolderItems = SlateTool.create(spec, {
  name: 'List Folder Items',
  key: 'list_folder_items',
  description: `List the files, folders, and web links contained within a Box folder. Returns item metadata including names, types, sizes, and modification dates. Supports pagination.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .describe('The ID of the folder to list (use "0" for the root folder)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of items to return (default 100, max 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('The folder ID that was listed'),
      folderName: z.string().optional().describe('Name of the folder'),
      totalCount: z.number().describe('Total number of items in the folder'),
      items: z.array(
        z.object({
          itemId: z.string().describe('ID of the item'),
          type: z.string().describe('Item type: file, folder, or web_link'),
          name: z.string().describe('Name of the item'),
          size: z.number().optional().describe('Size in bytes (files only)'),
          modifiedAt: z.string().optional().describe('ISO 8601 last modification timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [folderInfo, items] = await Promise.all([
      client.getFolderInfo(ctx.input.folderId, ['id', 'name']),
      client.getFolderItems(ctx.input.folderId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        fields: ['id', 'type', 'name', 'size', 'modified_at']
      })
    ]);

    let mappedItems = (items.entries || []).map((item: any) => ({
      itemId: item.id,
      type: item.type,
      name: item.name,
      size: item.size,
      modifiedAt: item.modified_at
    }));

    return {
      output: {
        folderId: folderInfo.id,
        folderName: folderInfo.name,
        totalCount: items.total_count || 0,
        items: mappedItems
      },
      message: `Listed ${mappedItems.length} item(s) in folder **${folderInfo.name}** (${folderInfo.id}). Total: ${items.total_count || 0}.`
    };
  });
