import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let maintenanceWindowSchema = z.object({
  windowId: z.number().describe('Unique maintenance window ID'),
  friendlyName: z.string().describe('Display name of the maintenance window'),
  type: z.number().describe('Window type: 1=Once, 2=Daily, 3=Weekly, 4=Monthly'),
  startTime: z
    .union([z.string(), z.number()])
    .describe('Start time: Unix timestamp for type=Once, "HH:mm" for recurring'),
  duration: z.number().describe('Duration in minutes'),
  value: z
    .string()
    .describe('Recurrence value: empty for Once/Daily, day numbers for Weekly/Monthly'),
  status: z.number().describe('Window status: 0=Paused, 1=Active')
});

export let listMaintenanceWindows = SlateTool.create(spec, {
  name: 'List Maintenance Windows',
  key: 'list_maintenance_windows',
  description: `Retrieve maintenance windows from your UptimeRobot account. Maintenance windows define scheduled downtime periods during which monitoring alerts are suppressed. Supports filtering by ID and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      windowIds: z
        .array(z.number())
        .optional()
        .describe('Filter to specific maintenance window IDs'),
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      maintenanceWindows: z.array(maintenanceWindowSchema),
      total: z.number().describe('Total number of maintenance windows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMWindows({
      mwindows: ctx.input.windowIds?.join('-'),
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let windows = result.maintenanceWindows.map((w: any) => ({
      windowId: w.id,
      friendlyName: w.friendly_name,
      type: w.type,
      startTime: w.start_time,
      duration: w.duration,
      value: w.value || '',
      status: w.status
    }));

    let total = result.pagination?.total ?? windows.length;

    return {
      output: { maintenanceWindows: windows, total },
      message: `Found **${total}** maintenance window(s).`
    };
  })
  .build();
