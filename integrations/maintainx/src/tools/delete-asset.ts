import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Permanently deletes an asset from MaintainX. This action cannot be undone. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      assetId: z.number().describe('ID of the asset to delete')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the deleted asset'),
      deleted: z.boolean().describe('Whether the asset was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    await client.deleteAsset(ctx.input.assetId);

    return {
      output: {
        assetId: ctx.input.assetId,
        deleted: true
      },
      message: `Deleted asset **#${ctx.input.assetId}**.`
    };
  })
  .build();
