import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Permanently deletes an asset from Kontent.ai. The asset must not be referenced by any content items.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('The ID or external ID of the asset to delete'),
      identifierType: z
        .enum(['id', 'external_id'])
        .default('id')
        .describe('Type of identifier')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    await client.deleteAsset(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: { deleted: true },
      message: `Deleted asset \`${ctx.input.identifier}\`.`
    };
  })
  .build();
