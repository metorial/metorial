import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokBusinessClient } from '../lib/client';
import { spec } from '../spec';

export let getAdReport = SlateTool.create(spec, {
  name: 'Get Ad Report',
  key: 'get_ad_report',
  description: `Pull advertising performance reports from TikTok Ads Manager. Configure dimensions (how to group data), metrics (what data to retrieve), data level, and date range. Supports filtering by campaign, ad group, or ad.

Common **dimensions**: \`stat_time_day\`, \`stat_time_hour\`, \`campaign_id\`, \`adgroup_id\`, \`ad_id\`, \`country_code\`.
Common **metrics**: \`spend\`, \`impressions\`, \`clicks\`, \`ctr\`, \`cpc\`, \`cpm\`, \`conversions\`, \`cost_per_conversion\`, \`reach\`, \`frequency\`.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      advertiserId: z.string().describe('TikTok Ads advertiser/account ID.'),
      reportType: z
        .enum(['BASIC', 'AUDIENCE', 'PLAYABLE_MATERIAL', 'CATALOG'])
        .optional()
        .describe('Type of report (default BASIC).'),
      dataLevel: z
        .enum(['AUCTION_ADVERTISER', 'AUCTION_CAMPAIGN', 'AUCTION_ADGROUP', 'AUCTION_AD'])
        .describe('Granularity of the report data.'),
      dimensions: z
        .array(z.string())
        .describe('Dimensions to group data by (e.g. ["stat_time_day", "campaign_id"]).'),
      metrics: z
        .array(z.string())
        .describe('Metrics to include (e.g. ["spend", "impressions", "clicks", "ctr"]).'),
      startDate: z.string().describe('Report start date in YYYY-MM-DD format.'),
      endDate: z.string().describe('Report end date in YYYY-MM-DD format.'),
      filters: z
        .array(
          z.object({
            fieldName: z.string().describe('Field to filter on (e.g. campaign_id).'),
            filterType: z.string().describe('Filter type (e.g. IN, NOT_IN).'),
            filterValue: z.string().describe('Filter value (JSON-encoded for arrays).')
          })
        )
        .optional()
        .describe('Filters to apply to the report.'),
      page: z.number().optional().describe('Page number (default 1).'),
      pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Results per page (default 20, max 1000).')
    })
  )
  .output(
    z.object({
      rows: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Report data rows with requested dimensions and metrics.'),
      totalCount: z.number().describe('Total number of rows available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokBusinessClient({ token: ctx.auth.token });

    let result = await client.getReport({
      advertiserId: ctx.input.advertiserId,
      reportType: ctx.input.reportType ?? 'BASIC',
      dataLevel: ctx.input.dataLevel,
      dimensions: ctx.input.dimensions,
      metrics: ctx.input.metrics,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      filters: ctx.input.filters,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        rows: result.rows,
        totalCount: result.pageInfo.totalNumber
      },
      message: `Retrieved **${result.rows.length}** report row(s) for ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
