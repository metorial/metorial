import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchVolumeDataPointSchema = z.object({
  period: z.string().describe('Start date of the 7-day period (yyyy-mm-dd)'),
  estimatedExactSearchVolume: z
    .number()
    .nullable()
    .describe('Estimated exact search volume for this period')
});

export let historicalSearchVolumeTool = SlateTool.create(spec, {
  name: 'Historical Search Volume',
  key: 'historical_search_volume',
  description: `Retrieve weekly historical search volume data for a keyword over a date range. Returns 7-day incremental search volume estimates, useful for **trend analysis**, identifying seasonal patterns, and understanding how keyword popularity changes over time.`,
  instructions: [
    'Provide a single keyword and a date range in yyyy-mm-dd format.',
    'The maximum date range is 366 days.'
  ],
  constraints: ['Maximum date range span is 366 days.', 'Dates must be in yyyy-mm-dd format.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('The keyword to look up historical search volume for'),
      startDate: z.string().describe('Start date for the range (yyyy-mm-dd)'),
      endDate: z.string().describe('End date for the range (yyyy-mm-dd)')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('The queried keyword'),
      dataPoints: z
        .array(searchVolumeDataPointSchema)
        .describe('Weekly search volume data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      marketplace: ctx.config.marketplace,
      apiType: ctx.config.apiType
    });

    let result = await client.historicalSearchVolume({
      keyword: ctx.input.keyword,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let dataPoints: Array<{ period: string; estimatedExactSearchVolume: number | null }> = [];

    // The API returns data in JSON:API format - can be a single object or array
    let items = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    for (let item of items) {
      let estimates = item.attributes?.estimate || [];
      for (let entry of estimates) {
        dataPoints.push({
          period: entry.date || '',
          estimatedExactSearchVolume: entry.estimated_exact_search_volume ?? null
        });
      }
    }

    return {
      output: {
        keyword: ctx.input.keyword,
        dataPoints
      },
      message: `Retrieved **${dataPoints.length}** weekly search volume data points for keyword "${ctx.input.keyword}" from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
