import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appointmentSchema = z.object({
  appointmentId: z.number().describe('Appointment ID'),
  summary: z.string().optional().describe('Appointment summary/title'),
  description: z.string().optional().describe('Description or notes'),
  customerId: z.number().optional().describe('Customer ID'),
  customerName: z.string().optional().describe('Customer name'),
  ticketId: z.number().optional().describe('Associated ticket ID'),
  startAt: z.string().optional().describe('Start date/time'),
  endAt: z.string().optional().describe('End date/time'),
  duration: z.number().optional().describe('Duration in minutes'),
  location: z.string().optional().describe('Location'),
  allDay: z.boolean().optional().describe('Whether this is an all-day appointment'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapAppointment = (a: any) => ({
  appointmentId: a.id,
  summary: a.summary,
  description: a.description,
  customerId: a.customer_id,
  customerName: a.customer?.fullname || a.customer?.business_then_name,
  ticketId: a.ticket_id,
  startAt: a.start_at,
  endAt: a.end_at,
  duration: a.duration,
  location: a.location,
  allDay: a.all_day,
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

export let searchAppointments = SlateTool.create(spec, {
  name: 'Search Appointments',
  key: 'search_appointments',
  description: `Search and list appointments. Filter by date range or show only your own appointments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z
        .string()
        .optional()
        .describe('Filter appointments starting from this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter appointments up to this date (YYYY-MM-DD)'),
      mine: z.boolean().optional().describe('Only return your own appointments'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      appointments: z.array(appointmentSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listAppointments(ctx.input);
    let appointments = (result.appointments || []).map(mapAppointment);

    return {
      output: {
        appointments,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${appointments.length}** appointment(s).`
    };
  })
  .build();

export let getAppointment = SlateTool.create(spec, {
  name: 'Get Appointment',
  key: 'get_appointment',
  description: `Retrieve detailed information about a specific appointment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The appointment ID to retrieve')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getAppointment(ctx.input.appointmentId);
    let a = result.appointment || result;

    return {
      output: mapAppointment(a),
      message: `Retrieved appointment **${a.summary || a.id}** at ${a.start_at || 'unscheduled'}.`
    };
  })
  .build();

export let createAppointment = SlateTool.create(spec, {
  name: 'Create Appointment',
  key: 'create_appointment',
  description: `Schedule a new appointment. Requires a summary and start time at minimum. Can be linked to a customer and/or ticket.`
})
  .input(
    z.object({
      summary: z.string().describe('Appointment title/summary'),
      startAt: z.string().describe('Start date/time (ISO 8601 format)'),
      endAt: z.string().optional().describe('End date/time (ISO 8601 format)'),
      description: z.string().optional().describe('Description or notes'),
      customerId: z.number().optional().describe('Customer ID to associate'),
      ticketId: z.number().optional().describe('Ticket ID to associate'),
      userId: z.number().optional().describe('Technician user ID to assign'),
      location: z.string().optional().describe('Appointment location'),
      appointmentDuration: z.number().optional().describe('Duration in minutes'),
      appointmentTypeId: z.number().optional().describe('Appointment type ID'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event'),
      emailCustomer: z.boolean().optional().describe('Send email notification to customer'),
      doNotEmail: z.boolean().optional().describe('Do not email the customer')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createAppointment(ctx.input);
    let a = result.appointment || result;

    return {
      output: mapAppointment(a),
      message: `Created appointment **${a.summary}** for ${a.start_at}.`
    };
  })
  .build();

export let updateAppointment = SlateTool.create(spec, {
  name: 'Update Appointment',
  key: 'update_appointment',
  description: `Update an existing appointment's details including time, location, and assignment.`
})
  .input(
    z.object({
      appointmentId: z.number().describe('The appointment ID to update'),
      summary: z.string().optional().describe('Updated title/summary'),
      startAt: z.string().optional().describe('Updated start date/time'),
      endAt: z.string().optional().describe('Updated end date/time'),
      description: z.string().optional().describe('Updated description'),
      customerId: z.number().optional().describe('Updated customer ID'),
      ticketId: z.number().optional().describe('Updated ticket ID'),
      userId: z.number().optional().describe('Updated technician user ID'),
      location: z.string().optional().describe('Updated location'),
      appointmentDuration: z.number().optional().describe('Updated duration in minutes'),
      appointmentTypeId: z.number().optional().describe('Updated appointment type ID'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { appointmentId, ...updateData } = ctx.input;
    let result = await client.updateAppointment(appointmentId, updateData);
    let a = result.appointment || result;

    return {
      output: mapAppointment(a),
      message: `Updated appointment **${a.summary || a.id}**.`
    };
  })
  .build();

export let deleteAppointment = SlateTool.create(spec, {
  name: 'Delete Appointment',
  key: 'delete_appointment',
  description: `Delete an appointment. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('The appointment ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteAppointment(ctx.input.appointmentId);

    return {
      output: { success: true },
      message: `Deleted appointment **${ctx.input.appointmentId}**.`
    };
  })
  .build();
