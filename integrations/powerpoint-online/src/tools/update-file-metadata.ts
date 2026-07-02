import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let updateFileMetadata = SlateTool.create(spec, {
  name: 'Update File Metadata',
  key: 'update_file_metadata',
  description: `Update the name or description of a file or folder in OneDrive or SharePoint. Use this to rename presentations or update their descriptions.`
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('ID of the file or folder. Provide either itemId or itemPath.'),
      itemPath: z.string().optional().describe('Path to the file or folder.'),
      driveId: z.string().optional().describe('ID of the drive containing the item.'),
      siteId: z.string().optional().describe('SharePoint site ID.'),
      name: z
        .string()
        .optional()
        .describe('New name for the file or folder (including extension).'),
      description: z.string().optional().describe('New description for the file or folder.')
    })
  )
  .output(driveItemOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let item = await client.updateItem({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      name: ctx.input.name,
      description: ctx.input.description
    });

    let output = mapDriveItem(item);

    return {
      output,
      message: `Updated **${output.name}**`
    };
  })
  .build();
