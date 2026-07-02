import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let createPlan = SlateTool.create(spec, {
  name: 'Create Plan',
  key: 'create_plan',
  description: `Create a new payment plan for collecting one-off or recurring payments. Supports configuring pricing, billing intervals, setup fees, donation mode, and more.`,
  instructions: [
    'For recurring plans, set paymentType to "recurring" and specify a billingInterval.',
    'For donation-style plans, set userSelectsAmount to true and omit the price.',
    'One-off plans can optionally show a quantity field with showQty.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      paymentType: z
        .enum(['recurring', 'one_off'])
        .describe('Whether this is a recurring subscription or one-off payment'),
      name: z.string().describe('Display name of the plan'),
      description: z
        .string()
        .optional()
        .describe('Description of the product/service shown to customers'),
      price: z.number().optional().describe('Plan price (omit for donation-style plans)'),
      currency: z
        .string()
        .optional()
        .describe('3-letter currency code (e.g. "usd", "gbp", "eur")'),
      userSelectsAmount: z
        .boolean()
        .optional()
        .describe('Set to true for donation-style plans where customer selects amount'),
      receiptText: z.string().optional().describe('Custom message added to email receipts'),
      hidden: z.boolean().optional().describe('Hide from public payments landing page'),
      successUrl: z
        .string()
        .optional()
        .describe('URL to redirect customer to after successful payment'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL for Payhere to send payment webhooks to'),
      payButtonText: z.string().optional().describe('Custom button label (defaults to "Pay")'),
      showQty: z.boolean().optional().describe('Show quantity field (one-off plans only)'),
      billingInterval: z
        .enum(['week', 'month', 'year'])
        .optional()
        .describe('Billing frequency (recurring plans only)'),
      setupFee: z
        .number()
        .optional()
        .describe('One-time setup fee charged on first payment (recurring plans only)'),
      minBillingCycles: z
        .number()
        .optional()
        .describe('Minimum billing cycles before customer can cancel (recurring plans only)'),
      billingDay: z
        .number()
        .optional()
        .describe('Day of month to charge (recurring plans only)'),
      cancelAfter: z
        .number()
        .optional()
        .describe('Automatically cancel subscription after N payments (recurring plans only)')
    })
  )
  .output(
    z.object({
      planId: z.number().describe('Unique plan identifier'),
      paymentType: z.string().describe('Plan type'),
      name: z.string().describe('Plan name'),
      description: z.string().nullable(),
      price: z.string().describe('Plan price'),
      priceInCents: z.number().describe('Plan price in cents'),
      currency: z.string().describe('Currency code'),
      slug: z.string().describe('URL-friendly identifier'),
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

    let plan = await client.createPlan(ctx.input);

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
      message: `Created ${ctx.input.paymentType === 'recurring' ? 'recurring' : 'one-off'} plan **${plan.name}** (ID: ${plan.planId}) at ${plan.price} ${plan.currency.toUpperCase()}.`
    };
  })
  .build();
