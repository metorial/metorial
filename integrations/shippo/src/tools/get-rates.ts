import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let getRates = SlateTool.create(spec, {
  name: 'Get Shipping Rates',
  key: 'get_rates',
  description: `Retrieve available shipping rates for an existing shipment. Use this to compare carrier options, prices, and estimated delivery times. Rates are sorted by the carrier and can be filtered by page.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      shipmentId: z.string().describe('ID of the shipment to get rates for'),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of available rates'),
      rates: z.array(
        z.object({
          rateId: z.string(),
          provider: z.string().optional(),
          servicelevelName: z.string().optional(),
          servicelevelToken: z.string().optional(),
          amount: z.string().optional(),
          currency: z.string().optional(),
          estimatedDays: z.number().optional(),
          durationTerms: z.string().optional(),
          carrierAccountId: z.string().optional(),
          arrivesBy: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = await client.getShipmentRates(ctx.input.shipmentId, {
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let rates = result.results.map((r: any) => ({
      rateId: r.object_id,
      provider: r.provider,
      servicelevelName: r.servicelevel?.name,
      servicelevelToken: r.servicelevel?.token,
      amount: r.amount,
      currency: r.currency,
      estimatedDays: r.estimated_days,
      durationTerms: r.duration_terms,
      carrierAccountId: r.carrier_account,
      arrivesBy: r.arrives_by
    }));

    return {
      output: {
        totalCount: result.count,
        rates
      },
      message: `Found **${result.count}** rates for shipment ${ctx.input.shipmentId}.`
    };
  })
  .build();
