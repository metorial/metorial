import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyItemTool = SlateTool.create(spec, {
  name: 'Copy File or Folder',
  key: 'copy_item',
  description: `Copies a file or folder to a new location in OneDrive or SharePoint. The copy is performed asynchronously by Microsoft Graph; a monitor URL is returned to track the operation status. Optionally rename the copy.`,
  instructions: [
    'Provide either itemId or itemPath to identify the source item.',
    'The copy operation is asynchronous. Use the returned monitorUrl to check progress.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the source drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('ID of the item to copy'),
      itemPath: z.string().optional().describe('Path to the item to copy'),
      destinationFolderId: z.string().describe('ID of the destination folder'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('ID of the destination drive if different from source'),
      newName: z
        .string()
        .optional()
        .describe('New name for the copy. If omitted, the original name is used.')
    })
  )
  .output(
    z.object({
      monitorUrl: z.string().describe('URL to monitor the async copy operation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.copyItem({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      destinationFolderId: ctx.input.destinationFolderId,
      destinationDriveId: ctx.input.destinationDriveId,
      newName: ctx.input.newName
    });

    return {
      output: result,
      message: `Copy operation started.${ctx.input.newName ? ` New name: **${ctx.input.newName}**.` : ''} Monitor URL provided to track progress.`
    };
  })
  .build();
