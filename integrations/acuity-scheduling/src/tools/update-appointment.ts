import { SlateTool } from 'slates';
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
      notes: z.string().optional().describe('Updated notes'),
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

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updateData.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
    if (ctx.input.fields !== undefined) {
      updateData.fields = ctx.input.fields.map(f => ({ id: f.fieldId, value: f.value }));
    }

    let a = await client.updateAppointment(ctx.input.appointmentId, updateData);

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
