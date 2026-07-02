import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAppointment = SlateTool.create(spec, {
  name: 'Create Appointment',
  key: 'create_appointment',
  description: `Create a new appointment in eTermin. Requires start/end times and a calendar ID. Optionally include customer details, service selection, notes, pricing, and notification preferences.`,
  instructions: [
    'Date/time format must be yyyy-mm-dd HH:MM (e.g. "2024-03-15 14:30").',
    'Price values are in cents (multiply by 100, e.g. 18.50 EUR = 1850).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      startDateTime: z.string().describe('Start date and time in yyyy-mm-dd HH:MM format'),
      endDateTime: z.string().describe('End date and time in yyyy-mm-dd HH:MM format'),
      calendarId: z.string().describe('Calendar ID to assign the appointment to'),
      services: z
        .string()
        .optional()
        .describe('Service ID(s) to associate with the appointment'),
      salutation: z.string().optional().describe('Customer salutation'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      company: z.string().optional().describe('Customer company name'),
      street: z.string().optional().describe('Customer street address'),
      zip: z.string().optional().describe('Customer postal code'),
      city: z.string().optional().describe('Customer city'),
      customerNumber: z.string().optional().describe('Customer number'),
      birthday: z.string().optional().describe('Customer birthday'),
      notes: z.string().optional().describe('Appointment notes'),
      location: z.string().optional().describe('Appointment location'),
      sendEmail: z
        .string()
        .optional()
        .describe('Set to "1" to send confirmation email, "0" to skip'),
      capacity: z
        .number()
        .optional()
        .describe('Number of capacity slots for this appointment'),
      priceGross: z.number().optional().describe('Gross price in cents (e.g. 1850 for 18.50)'),
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
        .describe('API response with the created appointment details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.createAppointment({
      start: ctx.input.startDateTime,
      end: ctx.input.endDateTime,
      calendarid: ctx.input.calendarId,
      services: ctx.input.services,
      salutation: ctx.input.salutation,
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      company: ctx.input.company,
      street: ctx.input.street,
      zip: ctx.input.zip,
      city: ctx.input.city,
      customernumber: ctx.input.customerNumber,
      birthday: ctx.input.birthday,
      notificationmsg: ctx.input.notes,
      location: ctx.input.location,
      sendemail: ctx.input.sendEmail,
      capacity: ctx.input.capacity,
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
      message: `Appointment created for **${ctx.input.startDateTime}** to **${ctx.input.endDateTime}** in calendar ${ctx.input.calendarId}.`
    };
  })
  .build();
