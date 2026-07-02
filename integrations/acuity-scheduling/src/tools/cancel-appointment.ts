import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelAppointment = SlateTool.create(spec, {
  name: 'Cancel Appointment',
  key: 'cancel_appointment',
  description: `Cancel a scheduled appointment. Optionally include a cancellation note and suppress the cancellation email notification.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The ID of the appointment to cancel'),
      cancelNote: z.string().optional().describe('Reason or note for the cancellation'),
      noEmail: z
        .boolean()
        .optional()
        .describe('If true, suppress the cancellation email notification')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Canceled appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      datetime: z.string().describe('Original appointment date and time'),
      type: z.string().describe('Appointment type name'),
      canceled: z.boolean().describe('Cancellation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let a = await client.cancelAppointment(ctx.input.appointmentId, {
      cancelNote: ctx.input.cancelNote,
      noEmail: ctx.input.noEmail
    });

    return {
      output: {
        appointmentId: a.id,
        firstName: a.firstName || '',
        lastName: a.lastName || '',
        datetime: a.datetime || '',
        type: a.type || '',
        canceled: true
      },
      message: `Appointment **#${a.id}** for **${a.firstName} ${a.lastName}** has been canceled.`
    };
  })
  .build();
