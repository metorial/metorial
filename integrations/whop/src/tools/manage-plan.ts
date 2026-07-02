import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let planOutputSchema = z.object({
  planId: z.string().describe('Unique plan identifier'),
  title: z.string().nullable().describe('Plan title'),
  description: z.string().nullable().describe('Plan description'),
  planType: z.string().describe('Plan type: renewal or one_time'),
  currency: z.string().describe('Currency code (e.g. usd)'),
  visibility: z.string().describe('Plan visibility status'),
  releaseMethod: z.string().describe('Release method: buy_now or waitlist'),
  billingPeriod: z.number().nullable().describe('Billing period in days'),
  initialPrice: z.number().nullable().describe('Initial price'),
  renewalPrice: z.number().nullable().describe('Renewal price'),
  trialPeriodDays: z.number().nullable().describe('Trial period in days'),
  memberCount: z.number().describe('Number of members on this plan'),
  purchaseUrl: z.string().nullable().describe('URL for purchasing this plan'),
  productId: z.string().nullable().describe('Associated product ID'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().describe('ISO 8601 last update timestamp')
});

let mapPlan = (p: any) => ({
  planId: p.id,
  title: p.title || null,
  description: p.description || null,
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
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export let managePlan = SlateTool.create(spec, {
  name: 'Manage Plan',
  key: 'manage_plan',
  description: `Create, update, retrieve, or delete a Whop plan. Plans define pricing, billing period, and release method for a product.
Use **action** to specify the operation: \`create\`, \`update\`, \`get\`, or \`delete\`.`,
  instructions: [
    'For "create": companyId and productId are required.',
    'For "update" and "get": planId is required.',
    'For "delete": planId is required. Existing memberships on the plan are not affected.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Operation to perform'),
      planId: z.string().optional().describe('Plan ID (required for get, update, delete)'),
      companyId: z
        .string()
        .optional()
        .describe('Company ID (required for create). Uses config companyId if not provided.'),
      productId: z.string().optional().describe('Product ID (required for create)'),
      title: z.string().optional().describe('Plan title (max 30 chars)'),
      description: z.string().optional().describe('Plan description (max 500 chars)'),
      planType: z.enum(['renewal', 'one_time']).optional().describe('Plan type'),
      billingPeriod: z.number().optional().describe('Billing period in days'),
      initialPrice: z.number().optional().describe('Initial price'),
      renewalPrice: z.number().optional().describe('Renewal price'),
      trialPeriodDays: z.number().optional().describe('Free trial period in days'),
      expirationDays: z.number().optional().describe('Membership expiration in days'),
      currency: z.string().optional().describe('ISO currency code (e.g. usd)'),
      visibility: z
        .enum(['visible', 'hidden', 'archived', 'quick_link'])
        .optional()
        .describe('Plan visibility'),
      releaseMethod: z.enum(['buy_now', 'waitlist']).optional().describe('Release method'),
      stock: z.number().optional().describe('Available stock quantity'),
      unlimitedStock: z.boolean().optional().describe('Whether stock is unlimited'),
      internalNotes: z.string().optional().describe('Internal notes for the plan')
    })
  )
  .output(
    z.object({
      plan: planOutputSchema.nullable().describe('Plan data (null for delete)'),
      deleted: z.boolean().optional().describe('Whether the plan was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.planId) throw new Error('planId is required for get action');
      let p = await client.getPlan(ctx.input.planId);
      return {
        output: { plan: mapPlan(p) },
        message: `Retrieved plan **${p.title || p.id}** (\`${p.id}\`).`
      };
    }

    if (action === 'create') {
      let companyId = ctx.input.companyId || ctx.config.companyId;
      if (!companyId) throw new Error('companyId is required for create action');
      if (!ctx.input.productId) throw new Error('productId is required for create action');

      let p = await client.createPlan({
        companyId,
        productId: ctx.input.productId,
        title: ctx.input.title,
        description: ctx.input.description,
        planType: ctx.input.planType,
        billingPeriod: ctx.input.billingPeriod,
        initialPrice: ctx.input.initialPrice,
        renewalPrice: ctx.input.renewalPrice,
        trialPeriodDays: ctx.input.trialPeriodDays,
        expirationDays: ctx.input.expirationDays,
        currency: ctx.input.currency,
        visibility: ctx.input.visibility,
        releaseMethod: ctx.input.releaseMethod,
        stock: ctx.input.stock,
        unlimitedStock: ctx.input.unlimitedStock,
        internalNotes: ctx.input.internalNotes
      });

      return {
        output: { plan: mapPlan(p) },
        message: `Created plan **${p.title || p.id}** (\`${p.id}\`) for product \`${ctx.input.productId}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.planId) throw new Error('planId is required for update action');

      let p = await client.updatePlan(ctx.input.planId, {
        title: ctx.input.title,
        description: ctx.input.description,
        billingPeriod: ctx.input.billingPeriod,
        initialPrice: ctx.input.initialPrice,
        renewalPrice: ctx.input.renewalPrice,
        trialPeriodDays: ctx.input.trialPeriodDays,
        expirationDays: ctx.input.expirationDays,
        currency: ctx.input.currency,
        visibility: ctx.input.visibility,
        stock: ctx.input.stock,
        unlimitedStock: ctx.input.unlimitedStock,
        internalNotes: ctx.input.internalNotes
      });

      return {
        output: { plan: mapPlan(p) },
        message: `Updated plan **${p.title || p.id}** (\`${p.id}\`).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.planId) throw new Error('planId is required for delete action');
      let result = await client.deletePlan(ctx.input.planId);
      return {
        output: { plan: null, deleted: !!result },
        message: `Deleted plan \`${ctx.input.planId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
