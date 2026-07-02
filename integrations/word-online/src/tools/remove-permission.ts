import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removePermission = SlateTool.create(spec, {
  name: 'Remove Permission',
  key: 'remove_permission',
  description: `Remove a sharing permission from a Word document or file in OneDrive or SharePoint.
Revokes a specific sharing link or user invitation by its permission ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item'),
      permissionId: z.string().describe('The ID of the permission to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the permission was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    await client.deletePermission(ctx.input.itemId, ctx.input.permissionId);

    return {
      output: {
        removed: true
      },
      message: `Removed permission \`${ctx.input.permissionId}\` from item \`${ctx.input.itemId}\``
    };
  })
  .build();
