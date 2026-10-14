import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scheduleIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSlotsTool = SlateTool.create(spec, {
  name: 'List Slots',
  key: 'list_slots',
  description:
    'List class or event slots on a capacity schedule, including full slots, occupancy, and waiting-list counts. Call list_schedules to find a schedule, then use a returned slotId with create_appointment.',
  constraints: ['Available only for capacity schedules.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      scheduleId: scheduleIdSchema,
      start: z
        .string()
        .optional()
        .describe(
          'Only slots starting at or after this calendar-local time (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'
        ),
      finish: z
        .string()
        .optional()
        .describe(
          'Only slots starting before this calendar-local time (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .optional()
        .describe('Maximum results, default 100 and maximum 2500'),
      offset: z.number().int().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      slots: z.array(
        z.object({
          slotId: z.string().describe('Slot ID to use when creating a capacity booking'),
          scheduleId: scheduleIdSchema,
          start: z.string().optional(),
          finish: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
          capacity: z
            .number()
            .nullable()
            .optional()
            .describe('Number of places; null means unlimited and zero means closed'),
          booked: z.number().optional().describe('Number of places taken'),
          waiting: z.number().optional().describe('Number of people on the waiting list'),
          color: z.string().optional(),
          price: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let { scheduleId, ...params } = ctx.input;
    let data = await new Client(ctx.auth).listSlots(scheduleId, params);
    let slots = data.map((slot: any) => ({
      slotId: String(slot.id),
      scheduleId,
      start: slot.start ?? undefined,
      finish: slot.finish ?? undefined,
      title: slot.title ?? undefined,
      description: slot.description ?? undefined,
      location: slot.location ?? undefined,
      capacity:
        slot.capacity === null
          ? null
          : slot.capacity != null
            ? Number(slot.capacity)
            : undefined,
      booked: slot.level != null ? Number(slot.level) : undefined,
      waiting: slot.waiting != null ? Number(slot.waiting) : undefined,
      color: slot.color != null ? String(slot.color) : undefined,
      price: slot.price != null ? String(slot.price) : undefined
    }));
    return {
      output: { slots },
      message: `Found **${slots.length}** slot(s) on schedule **${scheduleId}**.`
    };
  })
  .build();
