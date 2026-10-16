import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { metricsEntrySchema, rawSchema } from '../lib/types';
import { spec } from '../spec';

export let getMetrics = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description: `Retrieve aggregated performance metrics for a monitoring check over a specified time range. Includes uptime percentage, APDEX score, request statistics, and detailed timing breakdowns (DNS, connection, TLS, response). Metrics can be grouped by time period or by monitoring location.`,
  instructions: [
    'Metrics are aggregated hourly, then by day after 2 days, and by month after 40 days.',
    'When grouped by "time", keys are ISO 8601 timestamps. When grouped by "host", keys are location codes.',
    'Defaults to an aggregate for the last month when group and time range are omitted. Aggregate data is in summary; grouped entries retain provider keys in metrics.',
    'Uptime is only returned when the provider supplies it; grouped responses do not support uptime.'
  ],
  constraints: ['Time range cannot exceed the retention period of your account.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      checkToken: z.string().describe('The unique token identifier of the check'),
      from: z
        .string()
        .optional()
        .describe('Start of the time range (ISO 8601 timestamp). Defaults to 1 month ago.'),
      to: z
        .string()
        .optional()
        .describe('End of the time range (ISO 8601 timestamp). Defaults to now.'),
      group: z
        .enum(['time', 'host'])
        .optional()
        .describe(
          'Group metrics by time period or monitoring location. Omit for aggregate metrics.'
        )
    })
  )
  .output(
    z.object({
      uptime: z
        .number()
        .optional()
        .describe('Overall uptime percentage, only when supplied by the provider'),
      metrics: z
        .record(z.string(), metricsEntrySchema)
        .describe(
          'Metrics grouped by actual provider time keys or location codes; empty for an aggregate'
        ),
      summary: metricsEntrySchema
        .optional()
        .describe('Aggregate metrics when group is omitted'),
      raw: rawSchema.optional().describe('Complete original metrics response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMetrics(ctx.input.checkToken, {
      from: ctx.input.from,
      to: ctx.input.to,
      group: ctx.input.group
    });

    let entryCount = Object.keys(result.metrics).length;
    return {
      output: result,
      message: `Metrics for check \`${ctx.input.checkToken}\`: ${result.summary ? 'aggregate performance statistics' : `${entryCount} grouped entries`}${result.uptime !== undefined ? `; ${result.uptime}% uptime` : '; uptime is unavailable for this grouping'}.`
    };
  })
  .build();
