import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { datapointSchema, mapDatapoint } from '../lib/schemas';
import { spec } from '../spec';

export let updateDatapoint = SlateTool.create(spec, {
  name: 'Update Datapoint',
  key: 'update_datapoint',
  description: `Update an existing datapoint's value, timestamp, daystamp, or comment. Requires both the goal slug and the datapoint ID.`
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      datapointId: z.string().describe('Unique identifier of the datapoint to update'),
      value: z.number().optional().describe('New numeric value'),
      timestamp: z.number().optional().describe('New unix timestamp'),
      daystamp: z.string().optional().describe('New date in YYYYMMDD format'),
      comment: z.string().optional().describe('New comment')
    })
  )
  .output(datapointSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let { goalSlug, datapointId, ...params } = ctx.input;
    let raw = await client.updateDatapoint(goalSlug, datapointId, params);
    let datapoint = mapDatapoint(raw);

    return {
      output: datapoint,
      message: `Updated datapoint **${datapoint.datapointId}** on goal **${goalSlug}** (value: ${datapoint.value}).`
    };
  })
  .build();
