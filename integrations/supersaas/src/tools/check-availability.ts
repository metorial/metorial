import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkAvailabilityTool = SlateTool.create(spec, {
  name: 'Check Availability',
  key: 'check_availability',
  description: `Query available time slots on a schedule. Returns free slots that can be booked. Optionally filter by resource, date range, or appointment length.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('Schedule ID to check availability for'),
      from: z
        .string()
        .optional()
        .describe(
          'Start date to check from (ISO format YYYY-MM-DD HH:MM:SS). Defaults to current time.'
        ),
      length: z.number().optional().describe('Desired appointment length in minutes'),
      resource: z.string().optional().describe('Resource name or ID to filter availability'),
      full: z
        .boolean()
        .optional()
        .describe('If true, returns full slot details including description and location'),
      limit: z.number().optional().describe('Maximum number of available slots to return')
    })
  )
  .output(
    z.object({
      slots: z
        .array(
          z.object({
            slotId: z.string().optional().describe('Slot ID'),
            start: z.string().optional().describe('Slot start date/time'),
            finish: z.string().optional().describe('Slot end date/time'),
            title: z.string().optional().describe('Slot title'),
            description: z.string().optional().describe('Slot description'),
            location: z.string().optional().describe('Slot location'),
            count: z.number().optional().describe('Available count for capacity schedules')
          })
        )
        .describe('Available time slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getAvailability(ctx.input.scheduleId, {
      from: ctx.input.from,
      length: ctx.input.length,
      resource: ctx.input.resource,
      full: ctx.input.full,
      limit: ctx.input.limit
    });

    let slots = Array.isArray(data)
      ? data.map((item: any) => ({
          slotId: item.id != null ? String(item.id) : undefined,
          start: item.start ?? undefined,
          finish: item.finish ?? undefined,
          title: item.title ?? undefined,
          description: item.description ?? undefined,
          location: item.location ?? undefined,
          count: item.count != null ? Number(item.count) : undefined
        }))
      : [];

    return {
      output: { slots },
      message: `Found **${slots.length}** available slot(s) on schedule **${ctx.input.scheduleId}**.`
    };
  })
  .build();
