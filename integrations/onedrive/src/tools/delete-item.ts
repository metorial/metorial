import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteItemTool = SlateTool.create(spec, {
  name: 'Delete File or Folder',
  key: 'delete_item',
  description: `Permanently deletes a file or folder from OneDrive or SharePoint. Deleted items may be moved to the recycle bin depending on the drive configuration.`,
  instructions: ['Provide either itemId or itemPath to identify the item to delete.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('ID of the item to delete'),
      itemPath: z
        .string()
        .optional()
        .describe('Path to the item to delete (e.g. "/Documents/old-report.pdf")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteItem({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath
    });

    return {
      output: { deleted: true },
      message: `Item deleted successfully.`
    };
  })
  .build();
