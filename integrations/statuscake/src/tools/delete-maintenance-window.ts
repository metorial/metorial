import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMaintenanceWindow = SlateTool.create(spec, {
  name: 'Delete Maintenance Window',
  key: 'delete_maintenance_window',
  description: `Permanently delete a maintenance window. This action cannot be undone. Alerts for associated monitors will resume immediately.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      windowId: z.string().describe('ID of the maintenance window to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteMaintenanceWindow(ctx.input.windowId);

    return {
      output: { success: true },
      message: `Deleted maintenance window **${ctx.input.windowId}**.`
    };
  })
  .build();
