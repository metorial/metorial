import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve support analytics reports. Available report types:
- **volume**: Daily conversation volume counts
- **response_time**: Response time metrics and summaries (in seconds)
- **staff**: Staff performance metrics
- **tags**: Tag usage reports
- **channel_summary**: Aggregated metrics by channel

Reports can be filtered by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['volume', 'response_time', 'staff', 'tags', 'channel_summary'])
        .describe('Type of report to retrieve'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for the report range (ISO 8601 format)'),
      endDate: z
        .string()
        .optional()
        .describe('End date for the report range (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('The type of report returned'),
      reportData: z.any().describe('Report data (structure varies by report type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.getReport(ctx.input.reportType, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: {
        reportType: ctx.input.reportType,
        reportData: result
      },
      message: `Retrieved **${ctx.input.reportType}** report${ctx.input.startDate ? ` from ${ctx.input.startDate}` : ''}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}.`
    };
  })
  .build();
