import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appointmentSchema = z
  .object({
    appointmentId: z.number().optional().describe('Appointment ID'),
    name: z.string().optional().describe('Appointment name'),
    productId: z.number().optional().describe('Associated product ID'),
    duration: z.number().optional().describe('Duration in minutes'),
    price: z.string().optional().describe('Price'),
    currency: z.string().optional().describe('Currency code'),
    timezone: z.string().optional().describe('Timezone'),
    capacity: z.number().optional().describe('Max capacity per slot')
  })
  .passthrough();

export let listAppointments = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description: `Retrieve appointment types configured in Appointo. Optionally filter by a specific appointment ID or product ID. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().optional().describe('Retrieve a specific appointment by ID'),
      productId: z.number().optional().describe('Filter appointments by product ID'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of appointments to return (max 100, default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      appointments: z.array(appointmentSchema).describe('List of appointments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAppointments({
      appointmentId: ctx.input.appointmentId,
      productId: ctx.input.productId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let appointments = Array.isArray(result)
      ? result
      : (result?.appointments ?? result?.data ?? []);

    let mapped = appointments.map((a: any) => ({
      appointmentId: a.id,
      name: a.name,
      productId: a.product_id,
      duration: a.duration,
      price: a.price,
      currency: a.currency,
      timezone: a.timezone,
      capacity: a.capacity,
      ...a
    }));

    return {
      output: { appointments: mapped },
      message: `Retrieved **${mapped.length}** appointment(s).`
    };
  })
  .build();
