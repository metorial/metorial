import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assetOutput, responseItems } from '../lib/responses';
import { assetSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List generated assets (PDFs and images) stored in your Cloudlayer account. Returns asset metadata including download URLs. Use startAfterId for cursor pagination. Use get_asset to download a selected file.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of assets to return (provider default 10, max 100)'),
      offset: z
        .number()
        .optional()
        .describe(
          'Legacy pagination offset, forwarded for compatibility. Current endpoint docs describe startAfterId instead.'
        ),
      startAfterId: z
        .string()
        .optional()
        .describe('ID of the last item from the preceding page')
    })
  )
  .output(
    z.object({
      assets: z.array(assetSchema).describe('List of assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAssets({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      startAfterId: ctx.input.startAfterId
    });

    let items = responseItems(result, 'assets');
    let mapped = items.map(assetOutput);
    return {
      output: { assets: mapped },
      message: `Found **${mapped.length}** assets.`
    };
  })
  .build();
