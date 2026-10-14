import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { companyIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createCheckout = SlateTool.create(spec, {
  name: 'Create Checkout',
  key: 'create_checkout',
  description: `Create a Whop checkout session. Generates a shareable purchase URL for an existing plan or a new inline plan. Also supports setup mode for saving payment methods.
Use **mode** \`payment\` with either an existing \`planId\` or an inline \`plan\` definition, or use \`setup\` mode to save a payment method.`,
  instructions: [
    'For payment mode with existing plan: provide planId.',
    'For payment mode with new inline plan: provide plan with companyId, currency, and either productId or product (including title and externalIdentifier).',
    'An inline product externalIdentifier finds or creates a product: a matching product is updated with the supplied title; otherwise a product is created. Use productId to select an existing product without updating it.',
    'For setup mode: provide companyId.'
  ]
})
  .input(
    z.object({
      mode: z.enum(['payment', 'setup']).describe('Checkout mode'),
      planId: z.string().optional().describe('Existing plan ID (for payment mode)'),
      plan: z
        .object({
          companyId: z
            .string()
            .describe(
              'Company/account ID. Call list_accounts to discover authorized accounts.'
            ),
          productId: z
            .string()
            .optional()
            .describe('Product ID. Required unless product is supplied.'),
          product: z
            .object({
              title: z
                .string()
                .describe('Product title to create, or apply to a matching existing product'),
              externalIdentifier: z
                .string()
                .describe(
                  'Unique external product identifier. A matching existing product is updated; otherwise a product is created.'
                )
            })
            .optional()
            .describe(
              'Find or create the inline plan product by externalIdentifier. Updates a matching existing product; otherwise creates one. Use productId to select a product without updating it.'
            ),
          currency: z.string().describe('ISO currency code (e.g. usd)'),
          initialPrice: z.number().optional().describe('Initial price'),
          renewalPrice: z.number().optional().describe('Renewal price'),
          billingPeriod: z.number().optional().describe('Billing period in days'),
          planType: z.enum(['renewal', 'one_time']).optional().describe('Plan type'),
          trialPeriodDays: z.number().optional().describe('Trial period in days')
        })
        .optional()
        .describe('Inline plan definition (for payment mode without planId)'),
      companyId: companyIdSchema,
      redirectUrl: z.string().optional().describe('URL to redirect after checkout'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      currency: z.string().optional().describe('Override currency'),
      affiliateCode: z.string().optional().describe('Affiliate code')
    })
  )
  .output(
    z.object({
      checkoutId: z.string().describe('Checkout configuration ID'),
      purchaseUrl: z.string().nullable().describe('Shareable checkout URL'),
      mode: z.string().describe('Checkout mode'),
      currency: z.string().nullable().describe('Currency')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let companyId = ctx.input.companyId || ctx.config.companyId;

    if (ctx.input.mode === 'setup' && !companyId) {
      throw createApiServiceError('companyId is required for setup mode');
    }
    if (ctx.input.mode === 'payment' && !ctx.input.planId && !ctx.input.plan) {
      throw createApiServiceError('Either planId or plan is required for payment mode');
    }

    if (ctx.input.mode === 'payment' && ctx.input.planId && ctx.input.plan) {
      throw createApiServiceError('Provide either planId or plan, not both.');
    }
    if (
      ctx.input.mode === 'payment' &&
      ctx.input.plan &&
      !ctx.input.plan.productId &&
      !ctx.input.plan.product
    ) {
      throw createApiServiceError('Inline plans require productId or a product definition.');
    }

    let result = await client.createCheckoutConfiguration({
      mode: ctx.input.mode,
      planId: ctx.input.planId,
      plan: ctx.input.plan
        ? {
            companyId: ctx.input.plan.companyId,
            productId: ctx.input.plan.productId,
            product: ctx.input.plan.product,
            currency: ctx.input.plan.currency,
            initialPrice: ctx.input.plan.initialPrice,
            renewalPrice: ctx.input.plan.renewalPrice,
            billingPeriod: ctx.input.plan.billingPeriod,
            planType: ctx.input.plan.planType,
            trialPeriodDays: ctx.input.plan.trialPeriodDays
          }
        : undefined,
      companyId,
      redirectUrl: ctx.input.redirectUrl,
      metadata: ctx.input.metadata,
      currency: ctx.input.currency,
      affiliateCode: ctx.input.affiliateCode
    });

    return {
      output: {
        checkoutId: result.id,
        purchaseUrl: result.purchase_url || null,
        mode: result.mode,
        currency: result.currency || null
      },
      message: `Created checkout \`${result.id}\`${result.purchase_url ? `: [Purchase URL](${result.purchase_url})` : ''}.`
    };
  })
  .build();
