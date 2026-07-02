import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  .output(
    z.object({
      storefrontId: z.number().describe('Unique storefront ID'),
      name: z.string().describe('Storefront name'),
      url: z.string().describe('Storefront URL'),
      contactName: z.string().describe('Contact person name'),
      contactEmail: z.string().describe('Contact email address'),
      currency: z.string().describe('Currency code'),
      storefrontType: z.string().describe('Storefront type: cart, subscription, or clickbank'),
      subdomain: z.string().describe('Subdomain for v2 storefronts'),
      createdAt: z.number().describe('Creation timestamp (UNIX)'),
      updatedAt: z.number().describe('Last updated timestamp (UNIX)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let storefront = await client.getStorefront(ctx.input.storefrontId);

    return {
      output: storefront,
      message: `Retrieved storefront **${storefront.name}** (ID: ${storefront.storefrontId}, type: ${storefront.storefrontType}).`
    };
  })
  .build();
