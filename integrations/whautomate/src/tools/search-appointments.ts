import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchAppointments = SlateTool.create(spec, {
  name: 'Search Appointments',
  key: 'search_appointments',
  description: `Search existing appointments or get a specific appointment by ID. Filter by date range, client, service, staff, location, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z
        .string()
        .optional()
        .describe('Get a specific appointment by ID. If provided, other filters are ignored.'),
      fromDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client ID'),
      serviceId: z.string().optional().describe('Filter by service ID'),
      staffId: z.string().optional().describe('Filter by staff member ID'),
      locationId: z.string().optional().describe('Filter by location ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., Booked, Cancelled, Visited, No-Show)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      appointments: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of appointment records'),
      totalCount: z.number().optional().describe('Total number of matching appointments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (ctx.input.appointmentId) {
      let result = await client.getAppointment(ctx.input.appointmentId);
      return {
        output: {
          appointments: [result],
          totalCount: 1
        },
        message: `Found appointment **${ctx.input.appointmentId}** (${result.status || 'unknown status'}).`
      };
    }

    let result = await client.searchAppointments({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      clientId: ctx.input.clientId,
      serviceId: ctx.input.serviceId,
      staffId: ctx.input.staffId,
      locationId: ctx.input.locationId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let appointments = Array.isArray(result)
      ? result
      : result.appointments || result.data || [];
    let totalCount = result.totalCount || result.total || appointments.length;

    return {
      output: {
        appointments,
        totalCount
      },
      message: `Found **${totalCount}** appointment(s).`
    };
  })
  .build();
