import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCatalogVersion = SlateTool.create(spec, {
  name: 'Get Catalog Version',
  key: 'get_catalog_version',
  description: `Retrieve the Wix Stores catalog version installed on the site.
Use this before product catalog flows when you need to know whether the site uses Catalog V1 or Catalog V3.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      catalogVersion: z.any().describe('Raw Wix catalog version response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let result = await client.getCatalogVersion();

    return {
      output: { catalogVersion: result },
      message: 'Retrieved Wix Stores catalog version'
    };
  })
  .build();
