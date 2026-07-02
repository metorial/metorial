import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrowTerminalClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `View, create, toggle, or delete recurring schedule slots for automated posting. Schedule slots define recurring time windows (day + time) when posts should be published automatically on a given platform and account.
Use **action: list** to see existing slots, **create** to add new ones, **toggle** to enable/disable, or **delete** to remove a slot.`,
  instructions: [
    'Use "list" to retrieve all schedule slots, optionally filtered by account.',
    'Use "create" to add a new recurring posting slot — provide dayOfWeek, time, platform, and accountId.',
    'Use "toggle" to enable or disable an existing slot by its slotId.',
    'Use "delete" to permanently remove a schedule slot.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'toggle', 'delete'])
        .describe('Operation to perform on schedule slots'),
      accountId: z
        .string()
        .optional()
        .describe('Account ID to filter slots (for list) or target (for create)'),
      slotId: z.string().optional().describe('Slot ID for toggle or delete operations'),
      dayOfWeek: z
        .string()
        .optional()
        .describe('Day of the week for a new slot (e.g., "monday", "tuesday")'),
      time: z.string().optional().describe('Time in HH:MM (24h) format for a new slot'),
      platform: z
        .enum(['tiktok', 'x', 'instagram'])
        .optional()
        .describe('Target platform for a new slot'),
      enabled: z.boolean().optional().describe('Set enabled state when toggling a slot')
    })
  )
  .output(
    z.object({
      slots: z
        .array(
          z.object({
            slotId: z.string().describe('Unique identifier of the schedule slot'),
            dayOfWeek: z.string().describe('Day of the week'),
            time: z.string().describe('Scheduled time in HH:MM format'),
            platform: z.string().describe('Target platform'),
            accountId: z.string().describe('Associated account ID'),
            enabled: z.boolean().describe('Whether the slot is active')
          })
        )
        .optional()
        .describe('List of schedule slots (returned for list action)'),
      slot: z
        .object({
          slotId: z.string().describe('Unique identifier of the schedule slot'),
          dayOfWeek: z.string().describe('Day of the week'),
          time: z.string().describe('Scheduled time in HH:MM format'),
          platform: z.string().describe('Target platform'),
          accountId: z.string().describe('Associated account ID'),
          enabled: z.boolean().describe('Whether the slot is active')
        })
        .optional()
        .describe('The created or updated slot (returned for create/toggle actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the slot was deleted (returned for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrowTerminalClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let slots = await client.listScheduleSlots(ctx.input.accountId);
      let mapped = slots.map(s => ({
        slotId: s.slotId,
        dayOfWeek: s.dayOfWeek,
        time: s.time,
        platform: s.platform,
        accountId: s.accountId,
        enabled: s.enabled
      }));

      return {
        output: { slots: mapped },
        message: `Found **${mapped.length}** schedule slot(s).`
      };
    }

    if (action === 'create') {
      if (
        !ctx.input.dayOfWeek ||
        !ctx.input.time ||
        !ctx.input.platform ||
        !ctx.input.accountId
      ) {
        throw new Error(
          'dayOfWeek, time, platform, and accountId are required to create a schedule slot.'
        );
      }
      let slot = await client.createScheduleSlot({
        dayOfWeek: ctx.input.dayOfWeek,
        time: ctx.input.time,
        platform: ctx.input.platform,
        accountId: ctx.input.accountId
      });

      return {
        output: {
          slot: {
            slotId: slot.slotId,
            dayOfWeek: slot.dayOfWeek,
            time: slot.time,
            platform: slot.platform,
            accountId: slot.accountId,
            enabled: slot.enabled
          }
        },
        message: `Schedule slot **${slot.slotId}** created: ${slot.dayOfWeek} at ${slot.time} on **${slot.platform}**.`
      };
    }

    if (action === 'toggle') {
      if (!ctx.input.slotId) {
        throw new Error('slotId is required to toggle a schedule slot.');
      }
      let enabled = ctx.input.enabled !== undefined ? ctx.input.enabled : true;
      let slot = await client.toggleScheduleSlot(ctx.input.slotId, enabled);

      return {
        output: {
          slot: {
            slotId: slot.slotId,
            dayOfWeek: slot.dayOfWeek,
            time: slot.time,
            platform: slot.platform,
            accountId: slot.accountId,
            enabled: slot.enabled
          }
        },
        message: `Schedule slot **${slot.slotId}** ${slot.enabled ? 'enabled' : 'disabled'}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.slotId) {
        throw new Error('slotId is required to delete a schedule slot.');
      }
      await client.deleteScheduleSlot(ctx.input.slotId);

      return {
        output: { deleted: true },
        message: `Schedule slot **${ctx.input.slotId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
