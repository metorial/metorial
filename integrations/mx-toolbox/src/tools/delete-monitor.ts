import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMonitor = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Delete an existing monitor by its unique identifier. This permanently removes the monitor and stops all associated health checks and alerts.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      monitorUid: z.string().describe('The unique identifier (UID) of the monitor to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the monitor was successfully deleted'),
      monitorUid: z.string().describe('The UID of the deleted monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteMonitor(ctx.input.monitorUid);

    return {
      output: {
        deleted: true,
        monitorUid: ctx.input.monitorUid
      },
      message: `Successfully deleted monitor **${ctx.input.monitorUid}**.`
    };
  })
  .build();
