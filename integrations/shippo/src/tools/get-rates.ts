import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let getRates = SlateTool.create(spec, {
  name: 'Get Shipping Rates',
  key: 'get_rates',
  description: `Retrieve available shipping rates for an existing shipment. Use this to compare carrier options, prices, and estimated delivery times. Returns one provider page; ordering is not guaranteed.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      shipmentId: z.string().describe('ID of the shipment to get rates for'),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Omit page and keep any supplied filters and page size unchanged.'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe('Exact provider continuation; pass as nextPage to this tool.'),
      previousLink: z.string().optional(),
      hasMore: z.boolean().optional(),
      totalCount: z.number().optional().describe('Total number of available rates'),
      rates: z.array(
        z.object({
          rateId: z.string(),
          testMode: z
            .boolean()
            .optional()
            .describe(
              'Provider-reported rate test state; never infer it from carrier or price.'
            ),
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
    let client = new ShippoClient(ctx.auth);

    let result = await client.getShipmentRates(ctx.input.shipmentId, {
      nextPage: ctx.input.nextPage,
      page: ctx.input.page,
      results: ctx.input.resultsPerPage
    });

    let rates = result.results.map(r => ({
      rateId: r.object_id,
      testMode: r.test,
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
        nextLink: result.next,
        previousLink: result.previous,
        hasMore: !!result.next,
        rates
      },
      message: `Retrieved this page of rates for shipment ${ctx.input.shipmentId}.`
    };
  })
  .build();
