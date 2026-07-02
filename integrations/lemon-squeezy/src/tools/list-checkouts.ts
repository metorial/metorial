import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCheckoutsTool = SlateTool.create(spec, {
  name: 'List Checkouts',
  key: 'list_checkouts',
  description:
    'Retrieve custom checkout links created for Lemon Squeezy variants. Filter by store or variant and inspect URL, custom price, expiration, and test mode.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter checkouts by store ID'),
      variantId: z.string().optional().describe('Filter checkouts by variant ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      checkouts: z.array(
        z.object({
          checkoutId: z.string(),
          storeId: z.number(),
          variantId: z.number(),
          customPrice: z.number().nullable(),
          checkoutUrl: z.string(),
          expiresAt: z.string().nullable(),
          testMode: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listCheckouts({
      storeId: ctx.input.storeId,
      variantId: ctx.input.variantId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let checkouts = (response.data || []).map((checkout: any) => ({
      checkoutId: checkout.id,
      storeId: checkout.attributes.store_id,
      variantId: checkout.attributes.variant_id,
      customPrice: checkout.attributes.custom_price,
      checkoutUrl: checkout.attributes.url,
      expiresAt: checkout.attributes.expires_at,
      testMode: checkout.attributes.test_mode,
      createdAt: checkout.attributes.created_at,
      updatedAt: checkout.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { checkouts, hasMore },
      message: `Found **${checkouts.length}** checkout(s).`
    };
  })
  .build();
