import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDocument = SlateTool.create(spec, {
  name: 'Manage Document',
  key: 'manage_document',
  description: `Perform file management operations on a Word document or file in OneDrive or SharePoint.
Supports **renaming**, **moving** to a different folder, **copying**, and **deleting** files. Specify the desired action and provide the relevant parameters.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item to manage'),
      action: z
        .enum(['rename', 'move', 'copy', 'delete'])
        .describe('The file management action to perform'),
      newName: z
        .string()
        .optional()
        .describe('New name for the file (required for rename, optional for move/copy)'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('ID of the destination folder (required for move and copy)')
    })
  )
  .output(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('The ID of the resulting item (not returned for delete)'),
      name: z.string().optional().describe('The name of the resulting item'),
      webUrl: z.string().optional().describe('URL to open the item in browser'),
      monitorUrl: z.string().optional().describe("URL to monitor a copy operation's progress"),
      deleted: z.boolean().optional().describe('True if the item was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let { itemId, action, newName, destinationFolderId } = ctx.input;

    switch (action) {
      case 'rename': {
        if (!newName) throw new Error('newName is required for rename action');
        let renamed = await client.renameItem(itemId, newName);
        return {
          output: {
            itemId: renamed.itemId,
            name: renamed.name,
            webUrl: renamed.webUrl
          },
          message: `Renamed item to **${renamed.name}**`
        };
      }
      case 'move': {
        if (!destinationFolderId)
          throw new Error('destinationFolderId is required for move action');
        let moved = await client.moveItem(itemId, destinationFolderId, newName);
        return {
          output: {
            itemId: moved.itemId,
            name: moved.name,
            webUrl: moved.webUrl
          },
          message: `Moved **${moved.name}** to folder \`${destinationFolderId}\``
        };
      }
      case 'copy': {
        if (!destinationFolderId)
          throw new Error('destinationFolderId is required for copy action');
        let monitorUrl = await client.copyItem(itemId, destinationFolderId, newName);
        return {
          output: {
            monitorUrl
          },
          message: `Copy initiated for item \`${itemId}\` to folder \`${destinationFolderId}\`. Use the monitor URL to track progress.`
        };
      }
      case 'delete': {
        await client.deleteItem(itemId);
        return {
          output: {
            deleted: true
          },
          message: `Deleted item \`${itemId}\``
        };
      }
    }
  })
  .build();
