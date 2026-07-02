import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAppointment = SlateTool.create(spec, {
  name: 'Create Appointment',
  key: 'create_appointment',
  description: `Book a new appointment. Requires the appointment datetime, appointment type, and client details. Optionally provide a calendar, custom intake form field values, add-ons, and coupon/certificate codes.`,
  instructions: [
    'The datetime must be an available time slot. Use the Check Availability tool first to find open slots.',
    'Dates must be parseable by PHP strtotime() in the business timezone (e.g. "2024-03-15 14:00").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      datetime: z
        .string()
        .describe('Date and time for the appointment (e.g. "2024-03-15 14:00")'),
      appointmentTypeId: z.number().describe('Appointment type ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email address'),
      calendarId: z.number().optional().describe('Calendar ID (auto-selected if omitted)'),
      phone: z.string().optional().describe('Client phone number'),
      timezone: z
        .string()
        .optional()
        .describe('Client timezone (IANA format, e.g. "America/New_York")'),
      certificate: z.string().optional().describe('Package or coupon code to apply'),
      notes: z.string().optional().describe('Notes for the appointment'),
      addonIds: z.array(z.number()).optional().describe('IDs of add-ons to include'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Intake form field ID'),
            value: z.string().describe('Field value')
          })
        )
        .optional()
        .describe('Custom intake form field values')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Created appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email'),
      datetime: z.string().describe('Appointment date and time'),
      type: z.string().describe('Appointment type name'),
      calendarId: z.number().describe('Calendar ID'),
      calendar: z.string().describe('Calendar name'),
      price: z.string().describe('Appointment price'),
      confirmationPage: z.string().optional().describe('Confirmation page URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let a = await client.createAppointment({
      datetime: ctx.input.datetime,
      appointmentTypeID: ctx.input.appointmentTypeId,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      calendarID: ctx.input.calendarId,
      phone: ctx.input.phone,
      timezone: ctx.input.timezone,
      certificate: ctx.input.certificate,
      notes: ctx.input.notes,
      addonIDs: ctx.input.addonIds,
      fields: ctx.input.fields?.map(f => ({ id: f.fieldId, value: f.value }))
    });

    return {
      output: {
        appointmentId: a.id,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        email: a.email || '',
        datetime: a.datetime || '',
        type: a.type || '',
        calendarId: a.calendarID,
        calendar: a.calendar || '',
        price: a.price || '0',
        confirmationPage: a.confirmationPage || undefined
      },
      message: `Appointment **#${a.id}** created for **${a.firstName} ${a.lastName}** on **${a.datetime}**.`
    };
  })
  .build();
