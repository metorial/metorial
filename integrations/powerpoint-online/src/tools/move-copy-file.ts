import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let moveCopyFile = SlateTool.create(spec, {
  name: 'Move or Copy File',
  key: 'move_copy_file',
  description: `Move or copy a file or folder to a new location within OneDrive or SharePoint. Can also be used to rename a file without moving it. Copy operations are asynchronous and return a monitor URL.`,
  instructions: [
    'To rename without moving, set only "newName" and omit "destinationFolderId".',
    'Copy returns a monitor URL that can be polled to check progress.',
    'To copy across drives, provide "destinationDriveId" along with "destinationFolderId".'
  ]
})
  .input(
    z.object({
      operation: z.enum(['move', 'copy']).describe('Whether to move or copy the file'),
      itemId: z
        .string()
        .optional()
        .describe('ID of the file or folder to move/copy. Provide either itemId or itemPath.'),
      itemPath: z.string().optional().describe('Path of the file or folder to move/copy.'),
      driveId: z.string().optional().describe('ID of the drive containing the source item.'),
      siteId: z.string().optional().describe('SharePoint site ID for the source item.'),
      destinationFolderId: z.string().optional().describe('ID of the destination folder.'),
      destinationDriveId: z
        .string()
        .optional()
        .describe('ID of the destination drive (for cross-drive operations).'),
      newName: z.string().optional().describe('New name for the file at the destination.')
    })
  )
  .output(
    z.object({
      movedFile: driveItemOutputSchema
        .optional()
        .describe('Metadata of the moved file (move operations only)'),
      monitorUrl: z
        .string()
        .optional()
        .describe('URL to monitor copy progress (copy operations only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    if (ctx.input.operation === 'copy') {
      let monitorUrl = await client.copyItem({
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath,
        driveId: ctx.input.driveId,
        siteId: ctx.input.siteId,
        newParentId: ctx.input.destinationFolderId,
        newParentDriveId: ctx.input.destinationDriveId,
        newName: ctx.input.newName
      });

      return {
        output: { monitorUrl },
        message: `Copy operation started${ctx.input.newName ? ` as **${ctx.input.newName}**` : ''}`
      };
    }

    let item = await client.moveItem({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      newParentId: ctx.input.destinationFolderId,
      newParentDriveId: ctx.input.destinationDriveId,
      newName: ctx.input.newName
    });

    let output = mapDriveItem(item);

    return {
      output: { movedFile: output },
      message: `Moved file to **${output.name}**`
    };
  })
  .build();
