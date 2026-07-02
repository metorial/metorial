import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let availabilitySlotSchema = z
  .object({
    date: z.string().optional().describe('Date of the availability slot'),
    time: z.string().optional().describe('Time of the availability slot'),
    available: z.boolean().optional().describe('Whether the slot is available'),
    capacity: z.number().optional().describe('Available capacity')
  })
  .passthrough();

export let getAvailability = SlateTool.create(spec, {
  name: 'Get Calendar Availability',
  key: 'get_availability',
  description: `Check calendar availability for a specific appointment within a date range. Returns available time slots. Optionally filter by specific team members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to check availability for'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      teamMemberIds: z
        .array(z.number())
        .optional()
        .describe('Filter by specific team member IDs')
    })
  )
  .output(
    z.object({
      slots: z.array(availabilitySlotSchema).describe('Available time slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCalendarAvailability(ctx.input.appointmentId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      impersonatedTms: ctx.input.teamMemberIds
    });

    let slots = Array.isArray(result)
      ? result
      : (result?.slots ?? result?.availability ?? result?.data ?? []);

    return {
      output: { slots },
      message: `Retrieved availability for appointment **#${ctx.input.appointmentId}** from ${ctx.input.startDate}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}. Found **${slots.length}** slot(s).`
    };
  })
  .build();
