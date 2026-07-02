import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAppointmentSlots = SlateTool.create(spec, {
  name: 'Get Appointment Slots',
  key: 'get_appointment_slots',
  description: `Check available appointment time slots for a given service within a date range. Optionally filter by staff member and location. Use this before creating an appointment to find available times.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('Service ID to check availability for'),
      fromDate: z.string().describe('Start date (YYYY-MM-DD)'),
      toDate: z.string().describe('End date (YYYY-MM-DD)'),
      staffId: z.string().optional().describe('Filter by staff member ID'),
      locationId: z.string().optional().describe('Filter by location ID'),
      timezone: z.string().optional().describe('Timezone for the slots')
    })
  )
  .output(
    z.object({
      slots: z.array(z.record(z.string(), z.any())).describe('Array of available time slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let result = await client.getAppointmentSlots({
      serviceId: ctx.input.serviceId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      staffId: ctx.input.staffId,
      locationId: ctx.input.locationId,
      timezone: ctx.input.timezone
    });

    let slots = Array.isArray(result) ? result : result.slots || result.data || [];

    return {
      output: { slots },
      message: `Found **${slots.length}** available slot(s) from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
