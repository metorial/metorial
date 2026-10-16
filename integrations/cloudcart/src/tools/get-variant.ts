import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVariant = SlateTool.create(spec, {
  name: 'Get Variant',
  key: 'get_variant',
  description: 'Retrieve a variant by ID with its raw attributes and relationships.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      variantId: z.string().describe('Variant ID from list_variants')
    })
  )
  .output(
    z.object({
      variantId: z.string(),
      attributes: z.record(z.string(), z.any()),
      relationships: z.record(z.string(), z.any()).optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let res = await client.getVariant(ctx.input.variantId);
    return {
      output: {
        variantId: res.data.id,
        attributes: res.data.attributes,
        relationships: res.data.relationships,
        raw: res
      },
      message: `Retrieved variant **${res.data.id}**.`
    };
  })
  .build();
