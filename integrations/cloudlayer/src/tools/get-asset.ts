import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachAsset } from '../lib/files';
import { assetOutput } from '../lib/responses';
import { assetSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve details for a specific generated asset (PDF or image) by its ID. Returns asset metadata and prepares the generated file for download.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The unique asset identifier')
    })
  )
  .output(assetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAsset(ctx.input.assetId);

    let output = assetOutput(result);
    await attachAsset(ctx, result);
    return {
      output,
      message: `Asset **${output.assetId}** retrieved.`
    };
  })
  .build();
