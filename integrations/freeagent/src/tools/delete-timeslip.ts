import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTimeslip = SlateTool.create(spec, {
  name: 'Delete Timeslip',
  key: 'delete_timeslip',
  description: `Permanently delete a timeslip (time entry) from FreeAgent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      timeslipId: z.string().describe('The FreeAgent timeslip ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the timeslip was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteTimeslip(ctx.input.timeslipId);

    return {
      output: { deleted: true },
      message: `Deleted timeslip **${ctx.input.timeslipId}**`
    };
  })
  .build();
