import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAppointments = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description: `List appointments from Freshsales filtered by past or upcoming.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.enum(['upcoming', 'past']).describe('Filter by upcoming or past appointments')
    })
  )
  .output(
    z.object({
      appointments: z.array(
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
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let appointments = await client.listAppointments(ctx.input.filter);

    let mapped = appointments.map((a: Record<string, any>) => ({
      appointmentId: a.id,
      title: a.title,
      description: a.description,
      fromDate: a.from_date,
      endDate: a.end_date,
      location: a.location,
      targetableId: a.targetable_id,
      targetableType: a.targetable_type,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { appointments: mapped },
      message: `Found **${mapped.length}** ${ctx.input.filter} appointments.`
    };
  })
  .build();
