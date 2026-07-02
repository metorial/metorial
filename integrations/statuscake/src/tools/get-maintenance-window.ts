import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMaintenanceWindow = SlateTool.create(spec, {
  name: 'Get Maintenance Window',
  key: 'get_maintenance_window',
  description: `Retrieve detailed information about a specific maintenance window. Returns the schedule, repeat interval, affected tests, timezone, and current state.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      windowId: z.string().describe('ID of the maintenance window to retrieve')
    })
  )
  .output(
    z.object({
      window: z.record(z.string(), z.any()).describe('Maintenance window details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMaintenanceWindow(ctx.input.windowId);
    let window = result?.data ?? result;

    return {
      output: { window },
      message: `Retrieved maintenance window **${window.name ?? ctx.input.windowId}**.`
    };
  })
  .build();
