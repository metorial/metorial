import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { resolveReportingConfig } from '../lib/context';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report Data',
  key: 'get_report',
  description: `Retrieves report data from SegMetrics for a report type or saved report. Returns KPIs, graph data (time series), and tabular breakdowns.
Supports four report types: **leads**, **revenue**, **ads**, and **subscriptions**.
The optional report ID corresponds to a saved report created in the SegMetrics UI.`,
  instructions: [
    'Use ISO-8601 dates or relative dates such as -30 day and now.',
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
      reportId: z
        .string()
        .optional()
        .describe(
          'Optional saved report ID. Omit to use the report type without a saved report.'
        ),
      start: z.string().optional().describe('Start date: ISO-8601 or relative date.'),
      end: z.string().optional().describe('End date: ISO-8601 or relative date.'),
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
    let client = new ReportingClient(resolveReportingConfig(ctx));

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
      message: `Retrieved **${ctx.input.reportType}** report data for report **${ctx.input.reportId || 'default'}**${ctx.input.start ? ` from ${ctx.input.start}` : ''}${ctx.input.end ? ` to ${ctx.input.end}` : ''}.`
    };
  })
  .build();
