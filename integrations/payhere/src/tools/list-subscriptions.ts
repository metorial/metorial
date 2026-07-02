import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `Retrieve a paginated list of subscriptions, ordered chronologically with most recent first. Includes associated customer and plan data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe('Number of records per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          subscriptionId: z.number().describe('Subscription identifier'),
          customerId: z.number().describe('Associated customer ID'),
          membershipPlanId: z.number().describe('Associated plan ID'),
          status: z.string().describe('Subscription status (e.g. "active", "cancelled")'),
          lastCharged: z.string().nullable().describe('Last charge timestamp'),
          nextChargeAt: z.string().nullable().describe('Next scheduled charge date'),
          billingInterval: z.string().describe('Billing frequency'),
          billingIntervalCount: z.number(),
          provider: z
            .string()
            .nullable()
            .describe('Payment provider (e.g. "stripe", "gocardless")'),
          customer: z
            .object({
              customerId: z.number(),
              name: z.string(),
              email: z.string(),
              location: z.string().nullable()
            })
            .nullable()
            .describe('Subscribed customer'),
          plan: z
            .object({
              planId: z.number(),
              name: z.string(),
              price: z.string(),
              currency: z.string()
            })
            .nullable()
            .describe('Subscribed plan'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      meta: z.object({
        currentPage: z.number(),
        nextPage: z.number().nullable(),
        prevPage: z.number().nullable(),
        totalPages: z.number(),
        totalCount: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let result = await client.listSubscriptions({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.subscriptions.length}** subscriptions (page ${result.meta.currentPage} of ${result.meta.totalPages}, ${result.meta.totalCount} total).`
    };
  })
  .build();
