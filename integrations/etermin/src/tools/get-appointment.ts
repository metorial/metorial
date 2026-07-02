import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAppointment = SlateTool.create(spec, {
  name: 'Get Appointment',
  key: 'get_appointment',
  description: `Retrieve a single appointment by its ID. Returns full appointment details including start/end times, customer info, services, calendar assignment, notes, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.string().describe('The appointment ID (AppID) to retrieve')
    })
  )
  .output(
    z.object({
      appointment: z.record(z.string(), z.any()).describe('The appointment record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.getAppointment(ctx.input.appointmentId);

    let appointment = Array.isArray(result) ? result[0] : result;

    return {
      output: { appointment },
      message: `Retrieved appointment **${ctx.input.appointmentId}**.`
    };
  })
  .build();
