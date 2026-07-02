import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAppointments = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description: `Retrieve appointments from eTermin filtered by date range, calendar, customer email, or other criteria. Returns appointment details including times, customer info, services, and notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe('Start date filter in yyyy-mm-dd HH:MM format'),
      endDate: z.string().optional().describe('End date filter in yyyy-mm-dd HH:MM format'),
      calendarId: z.string().optional().describe('Filter by calendar ID'),
      email: z.string().optional().describe('Filter by customer email address'),
      contactId: z.string().optional().describe('Filter by customer/contact ID'),
      byCreationDate: z
        .string()
        .optional()
        .describe('Set to "1" to filter by creation date instead of appointment date')
    })
  )
  .output(
    z.object({
      appointments: z
        .array(z.record(z.string(), z.any()))
        .describe('List of appointment records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listAppointments({
      start: ctx.input.startDate,
      end: ctx.input.endDate,
      calendarid: ctx.input.calendarId,
      email: ctx.input.email,
      cid: ctx.input.contactId,
      bycreationdate: ctx.input.byCreationDate
    });

    let appointments = Array.isArray(result) ? result : [result];

    return {
      output: { appointments },
      message: `Found **${appointments.length}** appointment(s).`
    };
  })
  .build();
