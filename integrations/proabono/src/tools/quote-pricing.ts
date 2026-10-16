import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let quoteSchema = z.object({
  amountSubtotal: z.number().optional().describe('Pre-tax amount in cents'),
  amountTotal: z.number().optional().describe('Total amount including tax in cents'),
  amountRecurrence: z.number().optional().describe('Recurring amount per period in cents'),
  amountUpFront: z.number().optional().describe('Setup/upfront fee in cents'),
  amountTrial: z.number().optional().describe('Trial period cost in cents'),
  currency: z.string().optional().describe('Currency code'),
  rawResponse: z.any().optional().describe('Full quote response from ProAbono')
});

export let quotePricing = SlateTool.create(spec, {
  name: 'Quote Pricing',
  key: 'quote_pricing',
  description: `Compute exact pricing (including taxes) before performing actions.
Preview charges for subscription creation, upgrades, starts, usage changes, and balance lines.
Use this to show customers the correct charge before confirming an action.`,
  instructions: [
    'Use "subscription_creation" to preview charges for a new subscription.',
    'Use "subscription_upgrade" to preview charges for upgrading to a different offer.',
    'Use "subscription_start" to preview charges for starting a draft subscription.',
    'Use "usage_update" to preview charges from usage/consumption changes.',
    'Use "balance_line" to preview charges for adding a balance line.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      quoteType: z
        .enum([
          'subscription_creation',
          'subscription_upgrade',
          'subscription_start',
          'usage_update',
          'balance_line'
        ])
        .describe('Type of quote to compute'),
      referenceCustomer: z.string().optional().describe('Customer reference'),
      referenceOffer: z.string().optional().describe('Offer reference'),
      referenceSegment: z.string().optional().describe('Segment reference'),
      referenceSubscription: z
        .string()
        .optional()
        .describe('Legacy field; use subscriptionId or referenceCustomer for the Live API'),
      subscriptionId: z
        .number()
        .optional()
        .describe(
          'Subscription ID for start/upgrade/usage quotes. Discover IDs with manage_subscriptions list'
        ),
      referenceFeature: z.string().optional().describe('Feature reference for usage quotes'),
      dateStamp: z
        .string()
        .optional()
        .describe('For usage_update: required UTC timestamp of the usage event (ISO 8601).'),
      increment: z.number().optional().describe('Usage increment for quote'),
      quantityCurrent: z.number().optional().describe('Usage quantity for quote'),
      isEnabled: z.boolean().optional().describe('Feature toggle for quote'),
      amount: z.number().optional().describe('Amount in cents for balance line quote'),
      description: z.string().optional().describe('Description for balance line quote'),
      overrides: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional override parameters')
    })
  )
  .output(
    z.object({
      quote: quoteSchema.describe('Computed pricing quote')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { quoteType } = ctx.input;

    if (quoteType === 'subscription_creation') {
      if (!ctx.input.referenceOffer) throw createApiServiceError('referenceOffer is required');
      if (!ctx.input.referenceCustomer)
        throw createApiServiceError('referenceCustomer is required');
      let result = await client.quoteSubscriptionCreation({
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        ...(ctx.input.overrides || {})
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message:
          quote.amountTotal === undefined
            ? 'Computed subscription creation pricing.'
            : `Subscription creation quote: **${quote.amountTotal} cents** total`
      };
    }

    if (quoteType === 'subscription_upgrade') {
      if (!ctx.input.referenceOffer) throw createApiServiceError('referenceOffer is required');
      let result = await client.quoteSubscriptionUpgrade({
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        ReferenceOffer: ctx.input.referenceOffer,
        ...(ctx.input.overrides || {})
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message:
          quote.amountTotal === undefined
            ? 'Computed subscription upgrade pricing.'
            : `Subscription upgrade quote: **${quote.amountTotal} cents** total`
      };
    }

    if (quoteType === 'subscription_start') {
      let result = await client.quoteSubscriptionStart({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId,
        ReferenceCustomer: ctx.input.referenceCustomer
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message:
          quote.amountTotal === undefined
            ? 'Computed subscription start pricing.'
            : `Subscription start quote: **${quote.amountTotal} cents** total`
      };
    }

    if (quoteType === 'usage_update') {
      if (!ctx.input.referenceFeature)
        throw createApiServiceError('referenceFeature is required');
      if (!ctx.input.referenceCustomer)
        throw createApiServiceError('referenceCustomer is required');
      if (!ctx.input.dateStamp)
        throw createApiServiceError('dateStamp is required for usage_update.');
      let operations = [
        ctx.input.increment,
        ctx.input.quantityCurrent,
        ctx.input.isEnabled
      ].filter(value => value !== undefined);
      if (operations.length !== 1)
        throw createApiServiceError(
          'Provide exactly one of increment, quantityCurrent, or isEnabled.'
        );
      let result = await client.quoteUsageUpdate({
        DateStamp: ctx.input.dateStamp,
        ReferenceFeature: ctx.input.referenceFeature,
        ReferenceCustomer: ctx.input.referenceCustomer,
        IdSubscription: ctx.input.subscriptionId,
        Increment: ctx.input.increment,
        QuantityCurrent: ctx.input.quantityCurrent,
        IsEnabled: ctx.input.isEnabled
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message:
          quote.amountTotal === undefined
            ? 'Computed usage update pricing.'
            : `Usage update quote: **${quote.amountTotal} cents** total`
      };
    }

    if (quoteType === 'balance_line') {
      if (!ctx.input.referenceCustomer)
        throw createApiServiceError('referenceCustomer is required');
      if (ctx.input.amount == null) throw createApiServiceError('amount is required');
      let result = await client.quoteBalanceLine({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Amount: ctx.input.amount,
        Description: ctx.input.description
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message:
          quote.amountTotal === undefined
            ? 'Computed balance line pricing.'
            : `Balance line quote: **${quote.amountTotal} cents** total`
      };
    }

    throw createApiServiceError(`Unknown quote type: ${quoteType}`);
  })
  .build();

let mapQuote = (raw: any) => ({
  amountSubtotal: raw?.AmountSubtotal ?? raw?.PricingSubtotal,
  amountTotal: raw?.AmountTotal ?? raw?.PricingTotal,
  amountRecurrence: raw?.AmountRecurrence,
  amountUpFront: raw?.AmountUpFront,
  amountTrial: raw?.AmountTrial,
  currency: raw?.Currency,
  rawResponse: raw
});
