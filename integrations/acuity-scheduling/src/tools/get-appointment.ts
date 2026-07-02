import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let formFieldSchema = z.object({
  fieldId: z.number().describe('Field ID'),
  name: z.string().describe('Field name'),
  value: z.string().describe('Field value')
});

let formSchema = z.object({
  formId: z.number().describe('Form ID'),
  name: z.string().describe('Form name'),
  values: z.array(formFieldSchema).describe('Form field values')
});

export let getAppointment = SlateTool.create(spec, {
  name: 'Get Appointment',
  key: 'get_appointment',
  description: `Retrieve full details of a specific appointment by ID, including client info, intake form responses, and payment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The ID of the appointment to retrieve')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Unique appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email'),
      phone: z.string().describe('Client phone'),
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
      timezone: z.string().describe('Timezone'),
      notes: z.string().optional().describe('Appointment notes'),
      confirmationPage: z.string().optional().describe('Confirmation page URL'),
      forms: z.array(formSchema).optional().describe('Intake form responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let a = await client.getAppointment(ctx.input.appointmentId);

    let forms = ((a.forms as any[]) || []).map((f: any) => ({
      formId: f.id,
      name: f.name || '',
      values: ((f.values as any[]) || []).map((v: any) => ({
        fieldId: v.id || v.fieldID,
        name: v.name || '',
        value: v.value || ''
      }))
    }));

    return {
      output: {
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
        confirmationPage: a.confirmationPage || undefined,
        forms: forms.length > 0 ? forms : undefined
      },
      message: `Appointment **#${a.id}** for **${a.firstName} ${a.lastName}** on **${a.datetime}**.`
    };
  })
  .build();
