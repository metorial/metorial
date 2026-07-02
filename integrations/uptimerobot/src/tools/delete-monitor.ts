import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMonitor = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Permanently delete an uptime monitor. This action cannot be undone — all historical data for the monitor will be lost.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor to delete')
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the deleted monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteMonitor(ctx.input.monitorId);

    return {
      output: {
        monitorId: result.id
      },
      message: `Deleted monitor **${ctx.input.monitorId}**.`
    };
  })
  .build();
