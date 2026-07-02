import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Permanently deletes an asset from MaintainX. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
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
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

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
