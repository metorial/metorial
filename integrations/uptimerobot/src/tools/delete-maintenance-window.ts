import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMaintenanceWindow = SlateTool.create(spec, {
  name: 'Delete Maintenance Window',
  key: 'delete_maintenance_window',
  description: `Permanently delete a maintenance window. Alerts will no longer be suppressed during the previously scheduled period.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      windowId: z.number().describe('ID of the maintenance window to delete')
    })
  )
  .output(
    z.object({
      windowId: z.number().describe('ID of the deleted maintenance window')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteMWindow(ctx.input.windowId);

    return {
      output: {
        windowId: result.id
      },
      message: `Deleted maintenance window **${ctx.input.windowId}**.`
    };
  })
  .build();
