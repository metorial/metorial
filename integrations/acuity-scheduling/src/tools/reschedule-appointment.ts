import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rescheduleAppointment = SlateTool.create(spec, {
  name: 'Reschedule Appointment',
  key: 'reschedule_appointment',
  description: `Reschedule an existing appointment to a new date and time. Optionally change the calendar. The new datetime must be an available slot.`,
  instructions: [
    'Use the Check Availability tool first to find open time slots before rescheduling.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The ID of the appointment to reschedule'),
      datetime: z.string().describe('New date and time (e.g. "2024-03-20 10:00")'),
      calendarId: z.number().optional().describe('New calendar ID (optional)')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Rescheduled appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      datetime: z.string().describe('New appointment date and time'),
      type: z.string().describe('Appointment type name'),
      calendarId: z.number().describe('Calendar ID'),
      calendar: z.string().describe('Calendar name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let a = await client.rescheduleAppointment(ctx.input.appointmentId, {
      datetime: ctx.input.datetime,
      calendarID: ctx.input.calendarId
    });

    return {
      output: {
        appointmentId: a.id,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        datetime: a.datetime || '',
        type: a.type || '',
        calendarId: a.calendarID,
        calendar: a.calendar || ''
      },
      message: `Appointment **#${a.id}** rescheduled to **${a.datetime}**.`
    };
  })
  .build();
