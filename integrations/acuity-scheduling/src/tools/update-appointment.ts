import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAppointment = SlateTool.create(spec, {
  name: 'Update Appointment',
  key: 'update_appointment',
  description: `Update an existing appointment's client details, notes, or intake form field values. To change the appointment time, use the Reschedule Appointment tool instead.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The ID of the appointment to update'),
      firstName: z.string().optional().describe('Updated client first name'),
      lastName: z.string().optional().describe('Updated client last name'),
      email: z.string().optional().describe('Updated client email'),
      phone: z.string().optional().describe('Updated client phone number'),
      notes: z.string().optional().describe('Updated notes; requires admin=true'),
      certificate: z
        .string()
        .optional()
        .describe('Updated package or coupon code; requires admin=true'),
      admin: z
        .boolean()
        .optional()
        .describe(
          'Update as an administrator, disabling field validation; required to set notes or a certificate'
        ),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Intake form field ID'),
            value: z.string().describe('Updated field value')
          })
        )
        .optional()
        .describe('Updated intake form field values')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Updated appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email'),
      datetime: z.string().describe('Appointment date and time'),
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

    if (
      (ctx.input.notes !== undefined || ctx.input.certificate !== undefined) &&
      ctx.input.admin !== true
    ) {
      throw createApiServiceError('Setting notes or a certificate requires admin=true.');
    }
    let updateData = pickDefined({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      notes: ctx.input.notes,
      certificate: ctx.input.certificate,
      fields: ctx.input.fields?.map(f => ({ id: f.fieldId, value: f.value }))
    });
    if (Object.keys(updateData).length === 0) {
      throw createApiServiceError('Provide at least one appointment field to update.');
    }
    let a = await client.updateAppointment(ctx.input.appointmentId, updateData, {
      admin: ctx.input.admin
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
        calendar: a.calendar || ''
      },
      message: `Appointment **#${a.id}** updated for **${a.firstName} ${a.lastName}**.`
    };
  })
  .build();
