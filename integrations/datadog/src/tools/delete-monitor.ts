import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteMonitor = SlateTool.create(spec, {
  name: 'Delete Monitor',
  key: 'delete_monitor',
  description: `Delete a Datadog monitor by its ID. Optionally force-delete monitors that are referenced by other resources.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.number().describe('ID of the monitor to delete'),
      force: z
        .boolean()
        .optional()
        .describe('Force delete even if the monitor is referenced by other resources')
    })
  )
  .output(
    z.object({
      deletedMonitorId: z.number().describe('ID of the deleted monitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteMonitor(ctx.input.monitorId, ctx.input.force);

    return {
      output: { deletedMonitorId: ctx.input.monitorId },
      message: `Deleted monitor **#${ctx.input.monitorId}**`
    };
  })
  .build();
