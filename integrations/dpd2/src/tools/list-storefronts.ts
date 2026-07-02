import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStorefronts = SlateTool.create(spec, {
  name: 'List Storefronts',
  key: 'list_storefronts',
  description: `Retrieve all storefronts (stores/websites) associated with your DPD account. Returns a summary of each storefront including name, URL, currency, and type.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      storefronts: z.array(
        z.object({
          storefrontId: z.number().describe('Unique storefront ID'),
          name: z.string().describe('Storefront name'),
          url: z.string().describe('Storefront URL'),
          contactName: z.string().describe('Contact person name'),
          contactEmail: z.string().describe('Contact email address'),
          currency: z.string().describe('Currency code'),
          storefrontType: z
            .string()
            .describe('Storefront type: cart, subscription, or clickbank'),
          subdomain: z
            .string()
            .describe('Subdomain for v2 storefronts (append to dpdcart.com for full domain)'),
          createdAt: z.number().describe('Creation timestamp (UNIX)'),
          updatedAt: z.number().describe('Last updated timestamp (UNIX)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let storefronts = await client.listStorefronts();

    return {
      output: { storefronts },
      message: `Found **${storefronts.length}** storefront(s).`
    };
  })
  .build();
