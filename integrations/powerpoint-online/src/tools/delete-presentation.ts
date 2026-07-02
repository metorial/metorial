import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { driveItemLocationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deletePresentation = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Permanently delete a file or folder from OneDrive or SharePoint. Deleted items are moved to the recycle bin and can be recovered within the retention period.`,
  tags: {
    destructive: true
  }
})
  .input(driveItemLocationSchema)
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    await client.deleteItem({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId
    });

    return {
      output: { deleted: true },
      message: `File deleted successfully`
    };
  })
  .build();
