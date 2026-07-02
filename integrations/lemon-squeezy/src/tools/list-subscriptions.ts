import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptionsTool = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `Retrieve subscriptions from your Lemon Squeezy store. Filter by store, order, product, variant, or status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      orderId: z.string().optional().describe('Filter by order ID'),
      productId: z.string().optional().describe('Filter by product ID'),
      variantId: z.string().optional().describe('Filter by variant ID'),
      status: z
        .enum(['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'])
        .optional()
        .describe('Filter by subscription status'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          subscriptionId: z.string(),
          storeId: z.number(),
          customerId: z.number(),
          productId: z.number(),
          variantId: z.number(),
          productName: z.string(),
          variantName: z.string(),
          userName: z.string(),
          userEmail: z.string(),
          status: z.string(),
          statusFormatted: z.string(),
          renewsAt: z.string().nullable(),
          endsAt: z.string().nullable(),
          trialEndsAt: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listSubscriptions({
      storeId: ctx.input.storeId,
      orderId: ctx.input.orderId,
      productId: ctx.input.productId,
      variantId: ctx.input.variantId,
      status: ctx.input.status,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let subscriptions = (response.data || []).map((sub: any) => ({
      subscriptionId: sub.id,
      storeId: sub.attributes.store_id,
      customerId: sub.attributes.customer_id,
      productId: sub.attributes.product_id,
      variantId: sub.attributes.variant_id,
      productName: sub.attributes.product_name,
      variantName: sub.attributes.variant_name,
      userName: sub.attributes.user_name,
      userEmail: sub.attributes.user_email,
      status: sub.attributes.status,
      statusFormatted: sub.attributes.status_formatted,
      renewsAt: sub.attributes.renews_at,
      endsAt: sub.attributes.ends_at,
      trialEndsAt: sub.attributes.trial_ends_at,
      createdAt: sub.attributes.created_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { subscriptions, hasMore },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
