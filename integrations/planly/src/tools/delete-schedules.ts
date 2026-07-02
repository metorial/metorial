import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSchedules = SlateTool.create(spec, {
  name: 'Delete Schedules',
  key: 'delete_schedules',
  description: `Delete one or more scheduled posts by their IDs. This permanently removes the schedules and they cannot be recovered.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      scheduleIds: z.array(z.string()).describe('IDs of the schedules to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSchedules(ctx.input.scheduleIds);

    return {
      output: { success: true },
      message: `Deleted ${ctx.input.scheduleIds.length} schedule(s).`
    };
  });
