import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { datapointSchema, mapDatapoint } from '../lib/schemas';
import { spec } from '../spec';

export let listDatapoints = SlateTool.create(spec, {
  name: 'List Datapoints',
  key: 'list_datapoints',
  description: `Retrieve datapoints for a specific goal. Supports pagination and sorting. Returns the datapoint values, timestamps, comments, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by timestamp (default: desc)'),
      count: z.number().optional().describe('Limit on the number of datapoints returned'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      per: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      datapoints: z.array(datapointSchema).describe('List of datapoints for the goal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let { goalSlug, ...params } = ctx.input;
    let raw = await client.getDatapoints(goalSlug, params);
    let datapoints = (raw as any[]).map(mapDatapoint);

    return {
      output: { datapoints },
      message: `Retrieved **${datapoints.length}** datapoint(s) for goal **${goalSlug}**.`
    };
  })
  .build();
