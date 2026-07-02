import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAppointment = SlateTool.create(spec, {
  name: 'Get Appointment',
  key: 'get_appointment',
  description: `Retrieve a single appointment by ID from Freshsales.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to retrieve')
    })
  )
  .output(
    z.object({
      appointmentId: z.number(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      fromDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      targetableId: z.number().nullable().optional(),
      targetableType: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let appointment = await client.getAppointment(ctx.input.appointmentId);

    return {
      output: {
        appointmentId: appointment.id,
        title: appointment.title,
        description: appointment.description,
        fromDate: appointment.from_date,
        endDate: appointment.end_date,
        location: appointment.location,
        targetableId: appointment.targetable_id,
        targetableType: appointment.targetable_type,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      },
      message: `Retrieved appointment **${appointment.title || appointment.id}**.`
    };
  })
  .build();
