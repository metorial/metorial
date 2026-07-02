import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let planSchema = z.object({
  planId: z.string().describe('Unique plan identifier'),
  title: z.string().nullable().describe('Plan title'),
  planType: z.string().describe('Plan type: renewal or one_time'),
  currency: z.string().describe('Currency code'),
  visibility: z.string().describe('Plan visibility status'),
  releaseMethod: z.string().describe('Release method'),
  billingPeriod: z.number().nullable().describe('Billing period in days'),
  initialPrice: z.number().nullable().describe('Initial price'),
  renewalPrice: z.number().nullable().describe('Renewal price'),
  trialPeriodDays: z.number().nullable().describe('Trial period in days'),
  memberCount: z.number().describe('Number of members'),
  purchaseUrl: z.string().nullable().describe('Purchase URL'),
  productId: z.string().nullable().describe('Associated product ID'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listPlans = SlateTool.create(spec, {
  name: 'List Plans',
  key: 'list_plans',
  description: `List plans in your Whop company. Plans define the pricing and billing configuration for a product. Filter by product, visibility, plan type, or release method.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company ID. Uses config companyId if not provided.'),
      productIds: z.array(z.string()).optional().describe('Filter by product IDs'),
      planTypes: z
        .array(z.enum(['renewal', 'one_time']))
        .optional()
        .describe('Filter by plan type'),
      visibilities: z
        .array(z.enum(['visible', 'hidden', 'archived', 'quick_link']))
        .optional()
        .describe('Filter by visibility'),
      releaseMethods: z
        .array(z.enum(['buy_now', 'waitlist']))
        .optional()
        .describe('Filter by release method'),
      order: z
        .enum(['id', 'active_members_count', 'created_at'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of results (max 100)')
    })
  )
  .output(
    z.object({
      plans: z.array(planSchema),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let companyId = ctx.input.companyId || ctx.config.companyId;
    if (!companyId) throw new Error('companyId is required');

    let client = new WhopClient(ctx.auth.token);
    let result = await client.listPlans({
      companyId,
      productIds: ctx.input.productIds,
      planTypes: ctx.input.planTypes,
      visibilities: ctx.input.visibilities,
      releaseMethods: ctx.input.releaseMethods,
      order: ctx.input.order,
      direction: ctx.input.direction,
      after: ctx.input.cursor,
      first: ctx.input.limit
    });

    let plans = (result.data || []).map((p: any) => ({
      planId: p.id,
      title: p.title || null,
      planType: p.plan_type,
      currency: p.currency,
      visibility: p.visibility,
      releaseMethod: p.release_method,
      billingPeriod: p.billing_period ?? null,
      initialPrice: p.initial_price ?? null,
      renewalPrice: p.renewal_price ?? null,
      trialPeriodDays: p.trial_period_days ?? null,
      memberCount: p.member_count || 0,
      purchaseUrl: p.purchase_url || null,
      productId: p.product?.id || null,
      createdAt: p.created_at
    }));

    return {
      output: {
        plans,
        hasNextPage: result.page_info?.has_next_page || false,
        endCursor: result.page_info?.end_cursor || null
      },
      message: `Found **${plans.length}** plans.${result.page_info?.has_next_page ? ' More results available.' : ''}`
    };
  })
  .build();
