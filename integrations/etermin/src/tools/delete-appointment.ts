import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAppointment = SlateTool.create(spec, {
  name: 'Delete Appointment',
  key: 'delete_appointment',
  description: `Delete an appointment from eTermin by its ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appointmentId: z.string().describe('The appointment ID (AppID) to delete')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('API response confirming deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.deleteAppointment(ctx.input.appointmentId);

    return {
      output: { result },
      message: `Appointment **${ctx.input.appointmentId}** deleted.`
    };
  })
  .build();
