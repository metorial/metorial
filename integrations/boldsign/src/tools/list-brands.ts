import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBrands = SlateTool.create(spec, {
  name: 'List Brands',
  key: 'list_brands',
  description: `List all available brands in the account. Brands contain logo, color, and legal settings that can be applied to documents and templates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      result: z.array(z.record(z.string(), z.any())).describe('Array of brand objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listBrands();

    return {
      output: result,
      message: `Found **${result.result.length}** brands.`
    };
  })
  .build();
