import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { storefrontSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getStorefront = SlateTool.create(spec, {
  name: 'Get Storefront',
  key: 'get_storefront',
  description: `Retrieve detailed information about a specific DPD storefront by its ID, including contact details, currency, type, and subdomain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storefrontId: z.number().describe('The unique ID of the storefront to retrieve')
    })
  )
  .output(storefrontSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let storefront = await client.getStorefront(ctx.input.storefrontId);

    return {
      output: storefront,
      message: `Retrieved storefront #${storefront.storefrontId}.`
    };
  })
  .build();
