import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { datapointSchema, mapDatapoint } from '../lib/schemas';
import { spec } from '../spec';

export let deleteDatapoint = SlateTool.create(spec, {
  name: 'Delete Datapoint',
  key: 'delete_datapoint',
  description: `Delete a specific datapoint from a goal. This permanently removes the datapoint and recalculates the goal graph.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal'),
      datapointId: z.string().describe('Unique identifier of the datapoint to delete')
    })
  )
  .output(datapointSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw = await client.deleteDatapoint(ctx.input.goalSlug, ctx.input.datapointId);
    let datapoint = mapDatapoint(raw);

    return {
      output: datapoint,
      message: `Deleted datapoint **${datapoint.datapointId}** from goal **${ctx.input.goalSlug}**.`
    };
  })
  .build();
