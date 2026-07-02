import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptionItemsTool = SlateTool.create(spec, {
  name: 'List Subscription Items',
  key: 'list_subscription_items',
  description:
    'Retrieve Lemon Squeezy subscription items that link subscription records to price objects and quantities. Useful for quantity-based and usage-based billing inspection.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.string().optional().describe('Filter items by subscription ID'),
      priceId: z.string().optional().describe('Filter items by price ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      subscriptionItems: z.array(
        z.object({
          subscriptionItemId: z.string(),
          subscriptionId: z.number(),
          priceId: z.number(),
          quantity: z.number(),
          isUsageBased: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listSubscriptionItems({
      subscriptionId: ctx.input.subscriptionId,
      priceId: ctx.input.priceId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let subscriptionItems = (response.data || []).map((item: any) => ({
      subscriptionItemId: item.id,
      subscriptionId: item.attributes.subscription_id,
      priceId: item.attributes.price_id,
      quantity: item.attributes.quantity,
      isUsageBased: item.attributes.is_usage_based,
      createdAt: item.attributes.created_at,
      updatedAt: item.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { subscriptionItems, hasMore },
      message: `Found **${subscriptionItems.length}** subscription item(s).`
    };
  })
  .build();
