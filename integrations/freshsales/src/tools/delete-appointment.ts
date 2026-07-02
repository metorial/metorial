import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteAppointment = SlateTool.create(spec, {
  name: 'Delete Appointment',
  key: 'delete_appointment',
  description: `Delete an appointment from Freshsales by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteAppointment(ctx.input.appointmentId);

    return {
      output: { deleted: true },
      message: `Appointment **${ctx.input.appointmentId}** deleted successfully.`
    };
  })
  .build();
