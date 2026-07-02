import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let listReservations = SlateTool.create(spec, {
  name: 'List Reservations',
  key: 'list_reservations',
  description: `Searches and lists reservations within a time period. Filter by resource, customer, status, modification date, and custom properties. Supports pagination (up to 500 per page).`,
  instructions: [
    'By default, startTime and endTime filter by reservation rental period. Set listByCreationDate to true to filter by when reservations were created instead.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startTime: z.string().describe('Start of the query period (e.g. "2024-06-01")'),
      endTime: z.string().describe('End of the query period (e.g. "2024-06-30")'),
      resourceId: z.string().optional().describe('Filter by resource ID'),
      userId: z.string().optional().describe('Filter by customer user ID'),
      userEmail: z.string().optional().describe('Filter by customer email'),
      requiredStatus: z
        .string()
        .optional()
        .describe('Only include reservations with this status'),
      excludedStatus: z.string().optional().describe('Exclude reservations with this status'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only include reservations modified since this timestamp'),
      listByCreationDate: z
        .boolean()
        .optional()
        .describe('Filter by creation date instead of rental period'),
      sort: z
        .string()
        .optional()
        .describe('Sort by: user, email, phone, resource_id, start_time, end_time, etc.'),
      sortReverse: z.boolean().optional().describe('Sort in descending order'),
      page: z
        .number()
        .optional()
        .describe('Page number (zero-based, max 500 results per page)'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by custom reservation properties')
    })
  )
  .output(
    z.object({
      reservations: z
        .array(
          z.object({
            reservationId: z.string().describe('Reservation ID'),
            resourceId: z.string().optional().describe('Resource ID'),
            startTime: z.string().optional().describe('Start time'),
            endTime: z.string().optional().describe('End time'),
            status: z.string().optional().describe('Status'),
            quantity: z.number().optional().describe('Quantity'),
            email: z.string().optional().describe('Customer email'),
            firstName: z.string().optional().describe('Customer first name'),
            lastName: z.string().optional().describe('Customer last name'),
            totalPrice: z.number().optional().describe('Total price'),
            currency: z.string().optional().describe('Currency code')
          })
        )
        .describe('List of matching reservations'),
      totalCount: z.number().optional().describe('Total number of matching reservations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.listReservations({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      resourceId: ctx.input.resourceId,
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      requiredStatus: ctx.input.requiredStatus,
      excludedStatus: ctx.input.excludedStatus,
      modifiedSince: ctx.input.modifiedSince,
      listByCreationDate: ctx.input.listByCreationDate,
      sort: ctx.input.sort,
      sortReverse: ctx.input.sortReverse,
      page: ctx.input.page,
      detailLevel: 3, // name + settings
      customProperties: ctx.input.customProperties
    });

    let results = result?.results || result || [];
    let reservations = (Array.isArray(results) ? results : []).map((r: any) => ({
      reservationId: String(r.reservation_id),
      resourceId: r.resource_id ? String(r.resource_id) : undefined,
      startTime: r.start_time ? String(r.start_time) : undefined,
      endTime: r.end_time ? String(r.end_time) : undefined,
      status: r.status ? String(r.status) : undefined,
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      totalPrice: r.total_price != null ? Number(r.total_price) : undefined,
      currency: r.currency
    }));

    return {
      output: {
        reservations,
        totalCount: reservations.length
      },
      message: `Found **${reservations.length}** reservation(s) for period ${ctx.input.startTime} to ${ctx.input.endTime}.`
    };
  })
  .build();
