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

Reports cover all brands in the account by default. Filter by brand and date range. Dates default to the last 30 days; the range must span at least one day and no more than one year.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['volume', 'response_time', 'staff', 'tags', 'channel_summary'])
        .describe('Type of report to retrieve'),
      brand: z
        .string()
        .optional()
        .describe(
          'Brand subdomain to filter by, for example mybrand. Omit to include all account brands.'
        ),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date for the report range (ISO 8601 date, for example 2026-01-01). Defaults to 30 days ago.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date for the report range (ISO 8601 date, for example 2026-01-31). Defaults to today.'
        )
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
      brand: ctx.input.brand,
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
