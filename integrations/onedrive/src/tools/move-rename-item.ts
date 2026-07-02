import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let moveRenameItemTool = SlateTool.create(spec, {
  name: 'Move or Rename Item',
  key: 'move_rename_item',
  description: `Moves a file or folder to a new location and/or renames it. Can move items between folders or across drives in OneDrive/SharePoint. Provide a new parent folder to move, a new name to rename, or both.`,
  instructions: [
    'To rename only, provide just the newName. To move only, provide the destinationFolderId. To move and rename, provide both.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe(
          "ID of the drive containing the item. Defaults to the user's personal OneDrive."
        ),
      itemId: z.string().describe('ID of the item to move or rename'),
      destinationFolderId: z
        .string()
        .optional()
        .describe('ID of the destination folder to move the item to'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('ID of the destination drive if moving across drives'),
      newName: z.string().optional().describe('New name for the item')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique ID of the item'),
      name: z.string().describe('Updated name of the item'),
      webUrl: z.string().describe('Updated URL to view the item in a browser'),
      parentPath: z.string().optional().describe('Path of the new parent folder'),
      lastModifiedDateTime: z.string().describe('ISO 8601 last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let item = await client.moveItem({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      destinationFolderId: ctx.input.destinationFolderId,
      destinationDriveId: ctx.input.destinationDriveId,
      newName: ctx.input.newName
    });

    let actions: string[] = [];
    if (ctx.input.destinationFolderId) actions.push('moved');
    if (ctx.input.newName) actions.push('renamed');

    return {
      output: {
        itemId: item.id,
        name: item.name,
        webUrl: item.webUrl,
        parentPath: item.parentReference?.path,
        lastModifiedDateTime: item.lastModifiedDateTime
      },
      message: `Item **${item.name}** ${actions.join(' and ')}.`
    };
  })
  .build();
