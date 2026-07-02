import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitMetricData = SlateTool.create(spec, {
  name: 'Submit Metric Data',
  key: 'submit_metric_data',
  description: `Submit custom metric data points to a metric on the status page. Data points are timestamp/value pairs displayed as performance charts. Data should be submitted at least every 5 minutes for continuous display. Can backfill up to 28 days.`,
  constraints: [
    'Data must be submitted at least every 5 minutes for continuous display.',
    'Can backfill data up to 28 days in the past.'
  ]
})
  .input(
    z.object({
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
      submitted: z.boolean().describe('Whether the data was submitted successfully'),
      count: z.number().describe('Number of data points submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
    await client.submitMetricData(ctx.input.metricId, ctx.input.dataPoints);

    return {
      output: {
        submitted: true,
        count: ctx.input.dataPoints.length
      },
      message: `Submitted **${ctx.input.dataPoints.length}** data point(s) to metric \`${ctx.input.metricId}\`.`
    };
  })
  .build();
