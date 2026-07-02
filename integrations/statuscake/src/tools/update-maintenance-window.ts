import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMaintenanceWindow = SlateTool.create(spec, {
  name: 'Update Maintenance Window',
  key: 'update_maintenance_window',
  description: `Update an existing maintenance window. Modify schedule, repeat interval, targeted tests, and timezone. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      windowId: z.string().describe('ID of the maintenance window to update'),
      name: z.string().optional().describe('New name for the maintenance window'),
      startAt: z.string().optional().describe('Start time in ISO 8601 format'),
      endAt: z.string().optional().describe('End time in ISO 8601 format'),
      timezone: z.string().optional().describe('Timezone for the schedule'),
      repeatInterval: z
        .enum(['never', '1d', '1w', '2w', '1m'])
        .optional()
        .describe('Repeat interval'),
      tests: z
        .array(z.string())
        .optional()
        .describe('List of uptime test IDs to suppress alerts for'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to match uptime tests for alert suppression')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { windowId, startAt, endAt, repeatInterval, ...rest } = ctx.input;

    let data: Record<string, any> = { ...rest };

    if (startAt !== undefined) data.start_at = startAt;
    if (endAt !== undefined) data.end_at = endAt;
    if (repeatInterval !== undefined) data.repeat_interval = repeatInterval;

    await client.updateMaintenanceWindow(windowId, data);

    return {
      output: { success: true },
      message: `Updated maintenance window **${windowId}** successfully.`
    };
  })
  .build();
