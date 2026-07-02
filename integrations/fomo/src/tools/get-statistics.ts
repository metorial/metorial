import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStatistics = SlateTool.create(spec, {
  name: 'Get Statistics',
  key: 'get_statistics',
  description: `Retrieve notification performance statistics for a date range including impressions, clicks, hovers, conversions, and sales data. Returns both daily breakdowns and aggregated totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z
        .string()
        .describe('Start date for statistics in YYYY-MM-DD format (e.g., "2024-01-01").'),
      dateTo: z
        .string()
        .describe('End date for statistics in YYYY-MM-DD format (e.g., "2024-01-31").')
    })
  )
  .output(
    z.object({
      graph: z
        .array(
          z.object({
            date: z.string().describe('Date of the data point.'),
            convertedSaleInCents: z.number().describe('Converted sale amount in cents.'),
            conversionsCount: z.number().describe('Number of conversions.'),
            clickCount: z.number().describe('Number of clicks.'),
            impressionsCount: z.number().describe('Number of impressions.'),
            hoverCount: z.number().describe('Number of hovers.')
          })
        )
        .describe('Daily breakdown of metrics.'),
      totals: z
        .object({
          convertedSaleInCents: z.number().describe('Total converted sales in cents.'),
          conversionsCount: z.number().describe('Total conversions.'),
          clickCount: z.number().describe('Total clicks.'),
          impressionsCount: z.number().describe('Total impressions.'),
          hoverCount: z.number().describe('Total hovers.'),
          goalConversionCount: z.number().describe('Total goal conversions.'),
          goalConvertedSaleInDollars: z
            .number()
            .describe('Total goal converted sales in dollars.')
        })
        .describe('Aggregated totals for the date range.'),
      dateRange: z
        .object({
          from: z.string().describe('Start date.'),
          to: z.string().describe('End date.')
        })
        .describe('The queried date range.'),
      hasGaConversions: z
        .boolean()
        .describe('Whether Google Analytics conversions are configured.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let stats = await client.getStatistics(ctx.input.dateFrom, ctx.input.dateTo);

    return {
      output: stats,
      message: `Statistics from **${stats.dateRange.from}** to **${stats.dateRange.to}**: ${stats.totals.impressionsCount} impressions, ${stats.totals.clickCount} clicks, ${stats.totals.conversionsCount} conversions.`
    };
  })
  .build();
