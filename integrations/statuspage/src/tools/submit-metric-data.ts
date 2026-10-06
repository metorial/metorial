import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageIdSchema } from '../lib/validation';
import { spec } from '../spec';

export let submitMetricData = SlateTool.create(spec, {
  name: 'Submit Metric Data',
  key: 'submit_metric_data',
  tags: { readOnly: false, destructive: false },
  description: `Submit custom metric data points to a metric on the status page. Data points are timestamp/value pairs displayed as performance charts. Data should be submitted at least every 5 minutes for continuous display. Can backfill up to 28 days.`,
  constraints: [
    'Data must be submitted at least every 5 minutes for continuous display.',
    'Can backfill data up to 28 days in the past.'
  ]
})
  .input(
    z.object({
      pageId: pageIdSchema,
      metricId: z.string().describe('ID of the metric to submit data to'),
      dataPoints: z
        .array(
          z.object({
            timestamp: z.number().describe('Unix timestamp for the data point'),
            value: z.number().describe('Numeric value for the data point')
          })
        )
        .describe('Array of timestamp/value data points to submit')
    })
  )
  .output(
    z.object({
      submitted: z
        .boolean()
        .describe('Whether Statuspage accepted the data for asynchronous processing'),
      count: z.number().describe('Number of data points accepted'),
      acceptedDataPoints: z
        .array(z.object({ timestamp: z.number(), value: z.number() }))
        .optional()
        .describe(
          'Provider acknowledgement, with timestamps rounded to its 30-second intervals. Processing is asynchronous.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.input.pageId ?? ctx.config.pageId
    });
    const accepted = await client.submitMetricData(ctx.input.metricId, ctx.input.dataPoints);

    return {
      output: {
        submitted: true,
        count: ctx.input.dataPoints.length,
        acceptedDataPoints: accepted[ctx.input.metricId]
      },
      message: `Accepted **${ctx.input.dataPoints.length}** data point(s) for processing on metric \`${ctx.input.metricId}\`.`
    };
  })
  .build();
