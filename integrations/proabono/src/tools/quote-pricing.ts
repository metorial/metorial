import { SlateTool } from 'slates';
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
      referenceSubscription: z.string().optional().describe('Subscription reference'),
      subscriptionId: z.number().optional().describe('Subscription ID'),
      referenceFeature: z.string().optional().describe('Feature reference for usage quotes'),
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
      if (!ctx.input.referenceOffer) throw new Error('referenceOffer is required');
      if (!ctx.input.referenceCustomer) throw new Error('referenceCustomer is required');
      let result = await client.quoteSubscriptionCreation({
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        ...(ctx.input.overrides || {})
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message: `Subscription creation quote: **${quote.amountTotal ?? 0} cents** total (subtotal: ${quote.amountSubtotal ?? 0}, recurring: ${quote.amountRecurrence ?? 0})`
      };
    }

    if (quoteType === 'subscription_upgrade') {
      if (!ctx.input.referenceCustomer) throw new Error('referenceCustomer is required');
      if (!ctx.input.referenceOffer) throw new Error('referenceOffer is required');
      let result = await client.quoteSubscriptionUpgrade({
        ReferenceCustomer: ctx.input.referenceCustomer,
        ReferenceOffer: ctx.input.referenceOffer,
        ...(ctx.input.overrides || {})
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message: `Subscription upgrade quote: **${quote.amountTotal ?? 0} cents** total`
      };
    }

    if (quoteType === 'subscription_start') {
      let result = await client.quoteSubscriptionStart({
        ReferenceSubscription: ctx.input.referenceSubscription,
        IdSubscription: ctx.input.subscriptionId
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message: `Subscription start quote: **${quote.amountTotal ?? 0} cents** total`
      };
    }

    if (quoteType === 'usage_update') {
      if (!ctx.input.referenceFeature) throw new Error('referenceFeature is required');
      if (!ctx.input.referenceCustomer) throw new Error('referenceCustomer is required');
      let result = await client.quoteUsageUpdate({
        ReferenceFeature: ctx.input.referenceFeature,
        ReferenceCustomer: ctx.input.referenceCustomer,
        Increment: ctx.input.increment,
        QuantityCurrent: ctx.input.quantityCurrent,
        IsEnabled: ctx.input.isEnabled
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message: `Usage update quote: **${quote.amountTotal ?? 0} cents** total`
      };
    }

    if (quoteType === 'balance_line') {
      if (!ctx.input.referenceCustomer) throw new Error('referenceCustomer is required');
      if (ctx.input.amount == null) throw new Error('amount is required');
      let result = await client.quoteBalanceLine({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Amount: ctx.input.amount,
        Description: ctx.input.description
      });
      let quote = mapQuote(result);
      return {
        output: { quote },
        message: `Balance line quote: **${quote.amountTotal ?? 0} cents** total`
      };
    }

    throw new Error(`Unknown quote type: ${quoteType}`);
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
