import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMaintenanceWindow = SlateTool.create(spec, {
  name: 'Create Maintenance Window',
  key: 'create_maintenance_window',
  description: `Create a new maintenance window to suppress alerts during scheduled maintenance. Can target specific uptime checks by ID or by tag. Supports recurring schedules (daily, weekly, bi-weekly, monthly) with timezone configuration.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the maintenance window'),
      startAt: z
        .string()
        .describe(
          'Start local clock time in RFC3339 format; timezone determines the actual zone and the UTC offset is ignored'
        ),
      endAt: z
        .string()
        .describe(
          'End local clock time in RFC3339 format; timezone determines the actual zone and the UTC offset is ignored'
        ),
      timezone: z
        .string()
        .describe('Timezone for the schedule (e.g. "UTC", "America/New_York")'),
      repeatInterval: z
        .enum(['never', '1d', '1w', '2w', '1m'])
        .optional()
        .describe(
          'Repeat interval: never, 1d (daily), 1w (weekly), 2w (bi-weekly), 1m (monthly)'
        ),
      tests: z
        .array(z.string())
        .optional()
        .describe(
          'Uptime test IDs to suppress alerts for; at least one test or tag is required'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Tags to match uptime tests for alert suppression; at least one test or tag is required'
        )
    })
  )
  .output(
    z.object({
      windowId: z.string().describe('ID of the newly created maintenance window')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { startAt, endAt, repeatInterval, ...rest } = ctx.input;

    let data: Record<string, unknown> = {
      ...rest,
      start_at: startAt,
      end_at: endAt
    };

    if (repeatInterval !== undefined) data.repeat_interval = repeatInterval;

    let result = await client.createMaintenanceWindow(data);
    let windowId = result.data.new_id;

    return {
      output: { windowId },
      message: `Created maintenance window **${ctx.input.name}** (ID: ${windowId}).`
    };
  })
  .build();
