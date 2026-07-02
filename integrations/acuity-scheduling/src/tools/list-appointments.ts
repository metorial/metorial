import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appointmentSchema = z.object({
  appointmentId: z.number().describe('Unique appointment ID'),
  firstName: z.string().describe('Client first name'),
  lastName: z.string().describe('Client last name'),
  email: z.string().describe('Client email address'),
  phone: z.string().describe('Client phone number'),
  datetime: z.string().describe('Appointment date and time'),
  endTime: z.string().describe('Appointment end time'),
  duration: z.string().describe('Duration in minutes'),
  type: z.string().describe('Appointment type name'),
  appointmentTypeId: z.number().describe('Appointment type ID'),
  calendarId: z.number().describe('Calendar ID'),
  calendar: z.string().describe('Calendar name'),
  price: z.string().describe('Appointment price'),
  paid: z.string().describe('Whether the appointment has been paid'),
  canceled: z.boolean().describe('Whether the appointment is canceled'),
  timezone: z.string().describe('Timezone of the appointment'),
  notes: z.string().optional().describe('Appointment notes'),
  confirmationPage: z.string().optional().describe('Confirmation page URL')
});

export let listAppointments = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description: `Retrieve a list of scheduled appointments. Filter by date range, calendar, appointment type, client name, email, or phone. Returns up to 100 appointments per request.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      minDate: z
        .string()
        .optional()
        .describe('Only return appointments on or after this date (e.g. "2024-01-01")'),
      maxDate: z
        .string()
        .optional()
        .describe('Only return appointments on or before this date (e.g. "2024-12-31")'),
      calendarId: z.number().optional().describe('Filter by calendar ID'),
      appointmentTypeId: z.number().optional().describe('Filter by appointment type ID'),
      canceled: z
        .boolean()
        .optional()
        .describe('Include canceled appointments (default: false)'),
      firstName: z.string().optional().describe('Filter by client first name'),
      lastName: z.string().optional().describe('Filter by client last name'),
      email: z.string().optional().describe('Filter by client email'),
      phone: z.string().optional().describe('Filter by client phone'),
      max: z.number().optional().describe('Maximum number of results (default: 100)'),
      direction: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort direction by date (default: DESC)')
    })
  )
  .output(
    z.object({
      appointments: z.array(appointmentSchema).describe('List of appointments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listAppointments({
      minDate: ctx.input.minDate,
      maxDate: ctx.input.maxDate,
      calendarID: ctx.input.calendarId,
      appointmentTypeID: ctx.input.appointmentTypeId,
      canceled: ctx.input.canceled,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      max: ctx.input.max,
      direction: ctx.input.direction,
      excludeForms: true
    });

    let appointments = (results as any[]).map((a: any) => ({
      appointmentId: a.id,
      firstName: a.firstName || '',
      lastName: a.lastName || '',
      email: a.email || '',
      phone: a.phone || '',
      datetime: a.datetime || '',
      endTime: a.endTime || '',
      duration: a.duration || '',
      type: a.type || '',
      appointmentTypeId: a.appointmentTypeID,
      calendarId: a.calendarID,
      calendar: a.calendar || '',
      price: a.price || '0',
      paid: a.paid || 'no',
      canceled: a.canceled || false,
      timezone: a.timezone || '',
      notes: a.notes || undefined,
      confirmationPage: a.confirmationPage || undefined
    }));

    return {
      output: { appointments },
      message: `Found **${appointments.length}** appointment(s).`
    };
  })
  .build();
