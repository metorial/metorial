import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { resolveReportingConfig } from '../lib/context';
import { spec } from '../spec';

let dateRange = z
  .object({
    start: z.string().optional().describe('ISO-8601 or relative start date, such as -30 day.'),
    end: z.string().optional().describe('ISO-8601 or relative end date, such as now.'),
    scale: z.enum(['day', 'week', 'month']).optional()
  })
  .passthrough();

export let runReportQuery = SlateTool.create(spec, {
  name: 'Run Report Query',
  key: 'run_report_query',
  description:
    'Runs an ad hoc SegMetrics Data Explorer report query and returns its raw fields, rows, totals, and comparison data.',
  instructions: [
    'In a SegMetrics report, open the report-actions menu → Access from API. Use the generated JSON request body as query; do not include its API key or account ID.',
    'Use the dimension, metric, filter, and option definitions from that generated payload. Funnel reports can also include steps.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .object({
          type: z
            .string()
            .describe(
              'Report type, for example leads, revenue, ads, subscriptions, or funnel.'
            ),
          dimensions: z
            .array(z.string())
            .optional()
            .describe('Dimension slugs, such as clicks.channel.'),
          metrics: z
            .array(z.string())
            .optional()
            .describe('Metric slugs, such as leads and revenue.'),
          date_range: dateRange.optional(),
          filters: z
            .array(z.unknown())
            .optional()
            .describe('Filter objects copied from Access from API.'),
          steps: z.array(z.unknown()).optional().describe('Funnel step definitions.'),
          options: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Report options, including attribution_model or include_source.'),
          compare: dateRange.nullable().optional().describe('Optional comparison period.')
        })
        .passthrough()
        .describe(
          'The Data Explorer JSON report definition. Additional generated query fields are preserved.'
        )
    })
  )
  .output(z.object({ report: z.unknown().describe('Complete raw report query result.') }))
  .handleInvocation(async ctx => {
    let client = new ReportingClient(resolveReportingConfig(ctx));
    let report = await client.runReportQuery(ctx.input.query);
    return {
      output: { report },
      message: `Retrieved **${ctx.input.query.type}** report query results.`
    };
  })
  .build();
