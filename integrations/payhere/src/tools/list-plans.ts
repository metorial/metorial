import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let listPlans = SlateTool.create(spec, {
  name: 'List Plans',
  key: 'list_plans',
  description: `Retrieve a paginated list of payment plans. Plans represent products or services that customers can pay for, including one-off payments and recurring subscriptions.`,
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
      plans: z.array(
        z.object({
          planId: z.number().describe('Unique plan identifier'),
          paymentType: z.string().describe('Either "recurring" or "one_off"'),
          name: z.string().describe('Display name of the plan'),
          description: z.string().nullable().describe('Plan description'),
          price: z.string().describe('Plan price'),
          priceInCents: z.number().describe('Plan price in cents'),
          currency: z.string().describe('3-letter currency code'),
          slug: z.string().describe('URL-friendly plan identifier'),
          billingInterval: z
            .string()
            .nullable()
            .describe('Billing interval for recurring plans'),
          billingIntervalCount: z.number().nullable(),
          billingDay: z.number().nullable().describe('Day of month for recurring billing'),
          trialPeriodDays: z.number().nullable().describe('Trial period in days'),
          setupFee: z.string().nullable().describe('One-time setup fee'),
          hasSetupFee: z.boolean(),
          hidden: z.boolean().describe('Whether hidden from public landing page'),
          cancelAfter: z.number().nullable().describe('Auto-cancel after N payments'),
          minBillingCycles: z
            .number()
            .nullable()
            .describe('Minimum billing cycles before cancellation allowed'),
          userSelectsAmount: z
            .boolean()
            .describe('Whether user selects the amount (donation mode)'),
          showQty: z.boolean().describe('Whether quantity field is shown'),
          payButtonText: z.string().nullable().describe('Custom pay button text'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
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

    let result = await client.listPlans({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: result,
      message: `Found **${result.plans.length}** plans (page ${result.meta.currentPage} of ${result.meta.totalPages}, ${result.meta.totalCount} total).`
    };
  })
  .build();
