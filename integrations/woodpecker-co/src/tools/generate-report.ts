import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateReport = SlateTool.create(spec, {
  name: 'Generate Report',
  key: 'generate_report',
  description: `Generate a campaign performance report. Reports are generated asynchronously — this tool requests generation and returns a hash that can be used to fetch results. Available report types:
- **complete_statistics**: Full statistics per campaign step
- **general_statistics**: General campaign statistics
- **sent_messages**: Count of sent messages
- **open_rate**: Email open rates per campaign`,
  instructions: [
    'First call this tool to request report generation. Use the returned reportHash with the "Get Report" tool to fetch results.'
  ]
})
  .input(
    z.object({
      reportName: z
        .enum(['complete_statistics', 'general_statistics', 'sent_messages', 'open_rate'])
        .describe('Type of report to generate'),
      campaignId: z.number().optional().describe('Campaign ID to generate the report for'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date for the report period (ISO 8601 format)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date for the report period (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      reportHash: z.string().describe('Hash identifier to fetch the report results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let params: Record<string, any> = {};
    if (ctx.input.campaignId) params.campaign_id = ctx.input.campaignId;
    if (ctx.input.dateFrom) params.date_from = ctx.input.dateFrom;
    if (ctx.input.dateTo) params.date_to = ctx.input.dateTo;

    let result = await client.requestReport(ctx.input.reportName, params);

    return {
      output: { reportHash: result.hash ?? result.report_hash ?? '' },
      message: `Report **${ctx.input.reportName}** generation requested. Use the hash to retrieve results.`
    };
  })
  .build();
