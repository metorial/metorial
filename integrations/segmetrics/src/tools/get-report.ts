import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report Data',
  key: 'get_report',
  description: `Retrieves report data from SegMetrics for a saved report. Returns KPIs, graph data (time series), and tabular breakdowns.
Supports four report types: **leads**, **revenue**, **ads**, and **subscriptions**.
The report ID corresponds to a saved report created in the SegMetrics UI.`,
  instructions: [
    'Use date format YYYY-MM-DD for start and end dates.',
    'The reportId is the ID of a saved report from the SegMetrics dashboard.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['leads', 'revenue', 'ads', 'subscriptions'])
        .describe('Type of report to retrieve.'),
      reportId: z.string().describe('ID of the saved report to query.'),
      start: z.string().optional().describe('Start date for the report (YYYY-MM-DD).'),
      end: z.string().optional().describe('End date for the report (YYYY-MM-DD).'),
      scale: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Time scale for the graph data.')
    })
  )
  .output(
    z.object({
      report: z
        .unknown()
        .describe('Full report data including KPIs, graph data, and table breakdowns.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReportingClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let report = await client.getReport({
      reportType: ctx.input.reportType,
      reportId: ctx.input.reportId,
      start: ctx.input.start,
      end: ctx.input.end,
      scale: ctx.input.scale
    });

    return {
      output: {
        report
      },
      message: `Retrieved **${ctx.input.reportType}** report data for report **${ctx.input.reportId}**${ctx.input.start ? ` from ${ctx.input.start}` : ''}${ctx.input.end ? ` to ${ctx.input.end}` : ''}.`
    };
  })
  .build();
