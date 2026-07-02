import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let trackPurchase = SlateTool.create(spec, {
  name: 'Track Purchase',
  key: 'track_purchase',
  description: `Record a sales tracking event for a subscriber in a Deadline Funnel campaign. Creates a tracking record under the "Sales Tracked" section with the subscriber's email, purchase amount, and currency.`,
  instructions: [
    'You must provide a valid campaign ID. Use the **List Campaigns** tool to find available campaigns.',
    'Use standard ISO 4217 currency codes (e.g., "USD", "EUR", "GBP").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .describe('ID of the Deadline Funnel campaign to track the sale for'),
      email: z.string().describe('Email address of the subscriber who made the purchase'),
      amount: z.number().describe('Purchase amount'),
      currency: z.string().describe('Currency code (e.g., "USD", "EUR", "GBP")'),
      firstName: z.string().optional().describe('First name of the subscriber')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the sale was successfully tracked'),
      email: z.string().describe('Email address of the subscriber'),
      campaignId: z.string().describe('ID of the campaign the sale was tracked for'),
      amount: z.number().describe('Purchase amount recorded'),
      currency: z.string().describe('Currency code of the purchase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeadlineFunnelClient({ token: ctx.auth.token });
    let result = await client.trackPurchase({
      campaignId: ctx.input.campaignId,
      email: ctx.input.email,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      firstName: ctx.input.firstName
    });

    return {
      output: result,
      message: `Purchase of **${ctx.input.amount} ${ctx.input.currency}** tracked for **${ctx.input.email}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
