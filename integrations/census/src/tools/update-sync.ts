import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSync = SlateTool.create(spec, {
  name: 'Update Sync',
  key: 'update_sync',
  description: `Updates the configuration of an existing sync. Allows modifying the label, operation, schedule, mappings, pause state, and notification settings. Only specified fields are updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to update.'),
      label: z.string().optional().describe('New label for the sync.'),
      operation: z
        .enum(['upsert', 'update', 'insert', 'mirror', 'append'])
        .optional()
        .describe('New sync behavior.'),
      paused: z.boolean().optional().describe('Whether to pause or unpause the sync.'),
      scheduleFrequency: z
        .enum([
          'never',
          'continuous',
          'quarter_hourly',
          'hourly',
          'daily',
          'weekly',
          'expression'
        ])
        .optional()
        .describe('New schedule frequency.'),
      scheduleDay: z.string().optional().describe('Day of the week for weekly schedules.'),
      scheduleHour: z.number().optional().describe('Hour (0-23) for daily/weekly schedules.'),
      scheduleMinute: z
        .number()
        .optional()
        .describe('Minute (0-59) for daily/weekly schedules.'),
      cronExpression: z
        .string()
        .optional()
        .describe('Cron expression for expression-based schedules.'),
      mappings: z
        .array(
          z.object({
            from: z.object({
              type: z.enum(['column', 'constant_value']),
              data: z.union([
                z.string(),
                z.object({ value: z.string(), basicType: z.string() })
              ])
            }),
            to: z.string(),
            isPrimaryIdentifier: z.boolean().optional()
          })
        )
        .optional()
        .describe('Updated field mappings (replaces all existing mappings).'),
      failedRunNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable failed run notifications.'),
      failedRecordNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable failed record notifications.')
    })
  )
  .output(
    z.object({
      syncId: z.number().describe('ID of the updated sync.'),
      label: z.string().nullable().describe('Updated label.'),
      status: z.string().describe('Current sync status.'),
      operation: z.string().describe('Current sync behavior.'),
      paused: z.boolean().describe('Whether the sync is paused.'),
      updatedAt: z.string().describe('When the sync was last updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let updates: Record<string, unknown> = {};

    if (ctx.input.label !== undefined) updates.label = ctx.input.label;
    if (ctx.input.operation !== undefined) updates.operation = ctx.input.operation;
    if (ctx.input.paused !== undefined) updates.paused = ctx.input.paused;
    if (ctx.input.scheduleFrequency !== undefined)
      updates.scheduleFrequency = ctx.input.scheduleFrequency;
    if (ctx.input.scheduleDay !== undefined) updates.scheduleDay = ctx.input.scheduleDay;
    if (ctx.input.scheduleHour !== undefined) updates.scheduleHour = ctx.input.scheduleHour;
    if (ctx.input.scheduleMinute !== undefined)
      updates.scheduleMinute = ctx.input.scheduleMinute;
    if (ctx.input.cronExpression !== undefined)
      updates.cronExpression = ctx.input.cronExpression;
    if (ctx.input.failedRunNotificationsEnabled !== undefined)
      updates.failedRunNotificationsEnabled = ctx.input.failedRunNotificationsEnabled;
    if (ctx.input.failedRecordNotificationsEnabled !== undefined)
      updates.failedRecordNotificationsEnabled = ctx.input.failedRecordNotificationsEnabled;
    if (ctx.input.mappings !== undefined) {
      updates.mappings = ctx.input.mappings.map(m => ({
        from: m.from,
        to: m.to,
        isPrimaryIdentifier: m.isPrimaryIdentifier ?? false
      }));
    }

    let sync = await client.updateSync(ctx.input.syncId, updates);

    return {
      output: {
        syncId: sync.id,
        label: sync.label,
        status: sync.status,
        operation: sync.operation,
        paused: sync.paused,
        updatedAt: sync.updatedAt
      },
      message: `Updated sync **${sync.label || sync.id}** (${sync.operation}, ${sync.paused ? 'paused' : 'active'}).`
    };
  })
  .build();
