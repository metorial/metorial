import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDiscountsTool = SlateTool.create(spec, {
  name: 'List Discounts',
  key: 'list_discounts',
  description: `Retrieve discount codes from your Lemon Squeezy store. Returns discount name, code, amount, type, status, and usage statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      discounts: z.array(
        z.object({
          discountId: z.string(),
          storeId: z.number(),
          name: z.string(),
          code: z.string(),
          amount: z.number(),
          amountType: z.string(),
          isLimitedToProducts: z.boolean(),
          isLimitedRedemptions: z.boolean(),
          maxRedemptions: z.number(),
          status: z.string(),
          statusFormatted: z.string(),
          duration: z.string(),
          startsAt: z.string().nullable(),
          expiresAt: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listDiscounts({
      storeId: ctx.input.storeId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let discounts = (response.data || []).map((discount: any) => ({
      discountId: discount.id,
      storeId: discount.attributes.store_id,
      name: discount.attributes.name,
      code: discount.attributes.code,
      amount: discount.attributes.amount,
      amountType: discount.attributes.amount_type,
      isLimitedToProducts: discount.attributes.is_limited_to_products,
      isLimitedRedemptions: discount.attributes.is_limited_redemptions,
      maxRedemptions: discount.attributes.max_redemptions,
      status: discount.attributes.status,
      statusFormatted: discount.attributes.status_formatted,
      duration: discount.attributes.duration,
      startsAt: discount.attributes.starts_at,
      expiresAt: discount.attributes.expires_at,
      createdAt: discount.attributes.created_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { discounts, hasMore },
      message: `Found **${discounts.length}** discount(s).`
    };
  })
  .build();
