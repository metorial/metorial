import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteData = SlateTool.create(spec, {
  name: 'Delete Data',
  key: 'delete_data',
  description: `Delete time-series data points from an InfluxDB Cloud bucket within a specified time range.
Optionally filter by a predicate expression to target specific measurements or tag values.`,
  instructions: [
    'Provide RFC3339 timestamps for the start and stop time range.',
    'Optionally specify a predicate to filter which data to delete, e.g. `_measurement="cpu" AND host="server1"`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      bucket: z.string().describe('Name or ID of the bucket to delete data from'),
      start: z.string().describe('Start time (RFC3339 format, e.g. 2023-01-01T00:00:00Z)'),
      stop: z.string().describe('Stop time (RFC3339 format, e.g. 2023-12-31T23:59:59Z)'),
      predicate: z
        .string()
        .optional()
        .describe('InfluxDB delete predicate expression to filter data')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the delete operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteData({
      bucket: ctx.input.bucket,
      start: ctx.input.start,
      stop: ctx.input.stop,
      predicate: ctx.input.predicate
    });

    return {
      output: { success: true },
      message: `Successfully deleted data from bucket **${ctx.input.bucket}** between ${ctx.input.start} and ${ctx.input.stop}.`
    };
  })
  .build();
