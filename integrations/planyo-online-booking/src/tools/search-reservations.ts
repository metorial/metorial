import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let searchReservations = SlateTool.create(spec, {
  name: 'Search Reservations',
  key: 'search_reservations',
  description:
    'Finds reservations by customer name, login, user ID, reservation ID, email, phone number, or resource name without requiring a date range. Use the returned reservation IDs to retrieve details or perform reservation actions.',
  instructions: ['Multiple words narrow the search results.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .describe('Customer, reservation, or resource text to search for'),
      sort: z
        .enum([
          'user',
          'user_id',
          'email',
          'phone',
          'resource_id',
          'resource',
          'reservation_id',
          'duration'
        ])
        .optional()
        .describe('Field used to sort the matching reservations'),
      includeProperties: z
        .boolean()
        .optional()
        .describe('Include custom resource, site, and user properties')
    })
  )
  .output(
    z.object({
      reservations: z
        .array(
          z.object({
            reservationId: z
              .string()
              .describe('Reservation ID for subsequent reservation tools'),
            resourceId: z.string().optional().describe('Booked resource ID'),
            resourceName: z.string().optional().describe('Booked resource name'),
            userId: z.string().optional().describe('Customer user ID'),
            email: z.string().optional().describe('Customer email'),
            firstName: z.string().optional().describe('Customer first name'),
            lastName: z.string().optional().describe('Customer last name'),
            startTime: z.string().optional().describe('Rental start time'),
            endTime: z.string().optional().describe('Rental end time'),
            resourceProperties: z.any().optional().describe('Custom resource properties'),
            siteProperties: z.any().optional().describe('Custom site properties'),
            userProperties: z.any().optional().describe('Custom customer properties')
          })
        )
        .describe('Reservations matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);
    let result = await client.searchReservations({
      query: ctx.input.query,
      sort: ctx.input.sort,
      detailLevel: ctx.input.includeProperties ? 56 : 0
    });
    let reservations = (result.results || []).map((reservation: any) => ({
      reservationId: String(reservation.rental_id),
      resourceId:
        reservation.resource_id != null ? String(reservation.resource_id) : undefined,
      resourceName: reservation.name,
      userId: reservation.user_id != null ? String(reservation.user_id) : undefined,
      email: reservation.email,
      firstName: reservation.first_name,
      lastName: reservation.last_name,
      startTime: reservation.start_time != null ? String(reservation.start_time) : undefined,
      endTime: reservation.end_time != null ? String(reservation.end_time) : undefined,
      resourceProperties: reservation.resource_properties,
      siteProperties: reservation.site_properties,
      userProperties: reservation.user_properties
    }));

    return {
      output: { reservations },
      message: `Found ${reservations.length} reservation(s) matching "${ctx.input.query}".`
    };
  })
  .build();
