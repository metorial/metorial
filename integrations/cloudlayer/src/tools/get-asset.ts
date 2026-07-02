import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assetSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve details for a specific generated asset (PDF or image) by its ID. Returns the asset metadata including a pre-authenticated download URL.`,
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

    return {
      output: {
        assetId: result.id ?? result.assetId ?? ctx.input.assetId,
        jobId: result.jobId,
        ext: result.ext,
        type: result.type,
        size: result.size,
        url: result.url,
        timestamp: result.timestamp
      },
      message: `Asset **${ctx.input.assetId}** (${result.ext ?? 'unknown type'}, ${result.size ? `${result.size} bytes` : 'unknown size'}).${result.url ? ` [Download](${result.url})` : ''}`
    };
  })
  .build();
