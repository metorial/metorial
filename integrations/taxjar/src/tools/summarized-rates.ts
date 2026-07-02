import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSummarizedRates = SlateTool.create(spec, {
  name: 'List Summarized Tax Rates',
  key: 'list_summarized_rates',
  description: `Retrieve minimum and average sales tax rates for all US regions/states. Intended as a backup or fallback data source. For accurate per-order calculations, use the Calculate Sales Tax tool instead.`,
  constraints: ['Not recommended for production tax calculations. Use as a fallback only.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      summaryRates: z
        .array(
          z.object({
            countryCode: z.string().describe('Two-letter ISO country code'),
            country: z.string().describe('Full country name'),
            regionCode: z.string().describe('Region/state code'),
            region: z.string().describe('Full region/state name'),
            minimumRate: z
              .object({
                label: z.string(),
                rate: z.number()
              })
              .describe('Minimum sales tax rate for the region'),
            averageRate: z
              .object({
                label: z.string(),
                rate: z.number()
              })
              .describe('Average sales tax rate for the region')
          })
        )
        .describe('Summarized tax rates by region')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let rates = await client.listSummaryRates();

    return {
      output: {
        summaryRates: rates.map(r => ({
          countryCode: r.country_code,
          country: r.country,
          regionCode: r.region_code,
          region: r.region,
          minimumRate: r.minimum_rate,
          averageRate: r.average_rate
        }))
      },
      message: `Retrieved summarized tax rates for **${rates.length}** regions.`
    };
  })
  .build();
