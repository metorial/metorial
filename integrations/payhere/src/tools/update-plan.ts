import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let updatePlan = SlateTool.create(spec, {
  name: 'Update Plan',
  key: 'update_plan',
  description: `Update an existing payment plan's configuration. Supports modifying pricing, billing settings, visibility, and display options.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      planId: z.number().describe('ID of the plan to update'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      price: z.number().optional().describe('New price'),
      currency: z.string().optional().describe('New 3-letter currency code'),
      userSelectsAmount: z.boolean().optional().describe('Enable/disable donation mode'),
      receiptText: z.string().optional().describe('Custom receipt message'),
      hidden: z.boolean().optional().describe('Show or hide from public landing page'),
      successUrl: z.string().optional().describe('Redirect URL after payment'),
      webhookUrl: z.string().optional().describe('Webhook URL for payment notifications'),
      payButtonText: z.string().optional().describe('Custom pay button text'),
      showQty: z.boolean().optional().describe('Show quantity field'),
      billingInterval: z
        .enum(['week', 'month', 'year'])
        .optional()
        .describe('Billing frequency'),
      setupFee: z.number().optional().describe('Setup fee amount'),
      minBillingCycles: z.number().optional().describe('Minimum billing cycles before cancel'),
      billingDay: z.number().optional().describe('Billing day of month'),
      cancelAfter: z.number().optional().describe('Auto-cancel after N payments')
    })
  )
  .output(
    z.object({
      planId: z.number().describe('Plan identifier'),
      paymentType: z.string().describe('Plan type'),
      name: z.string().describe('Plan name'),
      description: z.string().nullable(),
      price: z.string().describe('Plan price'),
      priceInCents: z.number(),
      currency: z.string(),
      slug: z.string(),
      billingInterval: z.string().nullable(),
      hidden: z.boolean(),
      userSelectsAmount: z.boolean(),
      showQty: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    let { planId, ...updateParams } = ctx.input;
    let plan = await client.updatePlan(planId, updateParams);

    return {
      output: {
        planId: plan.planId,
        paymentType: plan.paymentType,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        priceInCents: plan.priceInCents,
        currency: plan.currency,
        slug: plan.slug,
        billingInterval: plan.billingInterval,
        hidden: plan.hidden,
        userSelectsAmount: plan.userSelectsAmount,
        showQty: plan.showQty,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      },
      message: `Updated plan **${plan.name}** (ID: ${plan.planId}).`
    };
  })
  .build();
