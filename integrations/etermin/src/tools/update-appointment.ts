import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAppointment = SlateTool.create(spec, {
  name: 'Update Appointment',
  key: 'update_appointment',
  description: `Update an existing appointment in eTermin. You must provide the appointment ID. Any provided fields will be updated; omitted fields remain unchanged.`,
  instructions: [
    'Date/time format must be yyyy-mm-dd HH:MM.',
    'Price values are in cents (multiply by 100).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.string().describe('The appointment ID (AppID) to update'),
      startDateTime: z
        .string()
        .optional()
        .describe('New start date/time in yyyy-mm-dd HH:MM format'),
      endDateTime: z
        .string()
        .optional()
        .describe('New end date/time in yyyy-mm-dd HH:MM format'),
      calendarId: z.string().optional().describe('New calendar ID to move the appointment to'),
      services: z.string().optional().describe('Updated service ID(s)'),
      salutation: z.string().optional().describe('Updated customer salutation'),
      firstName: z.string().optional().describe('Updated customer first name'),
      lastName: z.string().optional().describe('Updated customer last name'),
      email: z.string().optional().describe('Updated customer email'),
      phone: z.string().optional().describe('Updated customer phone number'),
      notes: z.string().optional().describe('Updated appointment notes'),
      location: z.string().optional().describe('Updated appointment location'),
      priceGross: z.number().optional().describe('Updated gross price in cents'),
      additional1: z.string().optional().describe('Custom field 1'),
      additional2: z.string().optional().describe('Custom field 2'),
      additional3: z.string().optional().describe('Custom field 3'),
      additional4: z.string().optional().describe('Custom field 4'),
      additional5: z.string().optional().describe('Custom field 5'),
      additional6: z.string().optional().describe('Custom field 6')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the updated appointment details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.updateAppointment({
      appid: ctx.input.appointmentId,
      start: ctx.input.startDateTime,
      end: ctx.input.endDateTime,
      calendarid: ctx.input.calendarId,
      services: ctx.input.services,
      salutation: ctx.input.salutation,
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      notificationmsg: ctx.input.notes,
      location: ctx.input.location,
      pricegross: ctx.input.priceGross,
      additional1: ctx.input.additional1,
      additional2: ctx.input.additional2,
      additional3: ctx.input.additional3,
      additional4: ctx.input.additional4,
      additional5: ctx.input.additional5,
      additional6: ctx.input.additional6
    });

    return {
      output: { result },
      message: `Appointment **${ctx.input.appointmentId}** updated.`
    };
  })
  .build();
