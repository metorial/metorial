import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReports = SlateTool.create(spec, {
  name: 'Get Reports',
  key: 'get_reports',
  description: `Retrieve campaign reports with trend data, delivery statistics, and additional rating question stats.
Reports can be filtered by a specific campaign and date range. Includes daily trend breakdown, overall scores, and delivery metrics (sent, opened, responded, bounced, opted-out).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Filter to a specific campaign (omit for all campaigns)'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      reports: z
        .array(z.any())
        .describe('Campaign report data including trends and delivery stats')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data = await client.getReports({
      campaignId: ctx.input.campaignId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let reports = Array.isArray(data) ? data : [data];

    return {
      output: { reports },
      message: `Retrieved **${reports.length}** campaign report(s)${ctx.input.campaignId ? ` for campaign ${ctx.input.campaignId}` : ''}.`
    };
  })
  .build();
