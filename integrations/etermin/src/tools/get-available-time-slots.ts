import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailableTimeSlots = SlateTool.create(spec, {
  name: 'Get Available Time Slots',
  key: 'get_available_time_slots',
  description: `Query available time slots for a specific calendar and date. Use this to check booking availability before creating an appointment. Optionally filter by service.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Date to check availability for (yyyy-mm-dd format)'),
      calendarId: z
        .string()
        .optional()
        .describe('Calendar ID to check. Omit to check all calendars.'),
      serviceId: z
        .string()
        .optional()
        .describe('Service ID to filter available slots for a specific service')
    })
  )
  .output(
    z.object({
      timeSlots: z
        .array(z.record(z.string(), z.any()))
        .describe('List of available time slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.getAvailableTimeSlots({
      date: ctx.input.date,
      calendarid: ctx.input.calendarId,
      serviceid: ctx.input.serviceId
    });

    let timeSlots = Array.isArray(result) ? result : [result];

    return {
      output: { timeSlots },
      message: `Found **${timeSlots.length}** available time slot(s) on ${ctx.input.date}.`
    };
  })
  .build();
