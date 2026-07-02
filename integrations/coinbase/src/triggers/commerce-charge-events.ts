import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commerceChargeEvents = SlateTrigger.create(spec, {
  name: 'Commerce Charge Events',
  key: 'commerce_charge_events',
  description:
    'Triggered when Coinbase Commerce charge lifecycle events occur, such as creation, confirmation, pending payment, failure, delayed, or resolution.'
})
  .input(
    z.object({
      eventId: z.string().describe('Commerce event ID'),
      eventType: z.string().describe('Event type (e.g., charge:confirmed)'),
      chargeCode: z.string().describe('Charge code'),
      chargeId: z.string().describe('Charge ID'),
      chargeName: z.string().optional().describe('Charge name'),
      chargeDescription: z.string().optional().nullable().describe('Charge description'),
      chargePricingType: z.string().optional().describe('Pricing type'),
      chargeStatus: z.string().optional().describe('Current charge status'),
      chargeHostedUrl: z.string().optional().describe('Hosted payment page URL'),
      localPrice: z
        .object({
          amount: z.string(),
          currency: z.string()
        })
        .optional()
        .describe('Requested local price'),
      createdAt: z.string().optional().describe('Charge creation time')
    })
  )
  .output(
    z.object({
      chargeCode: z.string().describe('Charge code'),
      chargeId: z.string().describe('Charge ID'),
      chargeName: z.string().optional().describe('Charge name'),
      chargeDescription: z.string().optional().nullable().describe('Charge description'),
      chargePricingType: z.string().optional().describe('Pricing type'),
      chargeStatus: z.string().optional().describe('Current charge status'),
      chargeHostedUrl: z.string().optional().describe('Hosted payment page URL'),
      localPriceAmount: z.string().optional().describe('Requested price amount'),
      localPriceCurrency: z.string().optional().describe('Requested price currency'),
      createdAt: z.string().optional().describe('Charge creation time')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.event) {
        return { inputs: [] };
      }

      let event = body.event;
      let charge = event.data || {};

      return {
        inputs: [
          {
            eventId: event.id || `commerce_${Date.now()}`,
            eventType: event.type || 'charge:unknown',
            chargeCode: charge.code || '',
            chargeId: charge.id || '',
            chargeName: charge.name,
            chargeDescription: charge.description || null,
            chargePricingType: charge.pricing_type,
            chargeStatus: extractChargeStatus(charge),
            chargeHostedUrl: charge.hosted_url,
            localPrice: charge.local_price
              ? {
                  amount: charge.local_price.amount,
                  currency: charge.local_price.currency
                }
              : undefined,
            createdAt: charge.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          chargeCode: ctx.input.chargeCode,
          chargeId: ctx.input.chargeId,
          chargeName: ctx.input.chargeName,
          chargeDescription: ctx.input.chargeDescription,
          chargePricingType: ctx.input.chargePricingType,
          chargeStatus: ctx.input.chargeStatus,
          chargeHostedUrl: ctx.input.chargeHostedUrl,
          localPriceAmount: ctx.input.localPrice?.amount,
          localPriceCurrency: ctx.input.localPrice?.currency,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

let extractChargeStatus = (charge: any): string => {
  if (charge.timeline && charge.timeline.length > 0) {
    return charge.timeline[charge.timeline.length - 1].status;
  }
  return charge.status || 'UNKNOWN';
};
