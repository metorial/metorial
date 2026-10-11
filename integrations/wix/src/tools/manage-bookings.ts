import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getNextCursor } from '../lib/client';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBookings = SlateTool.create(spec, {
  name: 'Manage Bookings',
  key: 'manage_bookings',
  description: `List bookings services, query bookings, create new bookings, or cancel bookings on a Wix site.
Use **action** to specify the operation: \`list_services\`, \`get_service\`, \`list_bookings\`, \`get_booking\`, \`create_booking\`, or \`cancel_booking\`.
Services represent appointments, classes, or courses. Bookings are customer reservations for services.`,
  instructions: [
    'Use "list_services" to discover available services before creating bookings.',
    'For "create_booking", bookingData is the Wix booking object (bookedEntity with a slot or schedule, contactDetails, totalParticipants, and so on). To also set participantNotification or other request options, pass {"booking": {...}, "participantNotification": {...}}.',
    '"list_bookings" uses cursor paging: pass nextCursor from the previous response as cursor. Filter with fields such as status, startDate (recommended in every filter), or bookedEntity.item.slot.serviceId.',
    '"cancel_booking" uses the booking revision; it is fetched automatically when revision is omitted.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_services',
          'get_service',
          'list_bookings',
          'get_booking',
          'create_booking',
          'cancel_booking'
        ])
        .describe('Operation to perform'),
      serviceId: z.string().optional().describe('Service ID (for get_service)'),
      bookingId: z
        .string()
        .optional()
        .describe('Booking ID (for get_booking and cancel_booking)'),
      bookingData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Booking creation data including bookedEntity, contactDetails, etc.'),
      revision: z
        .string()
        .optional()
        .describe('Current booking revision (for cancel_booking; fetched when omitted)'),
      notifyParticipants: z
        .boolean()
        .optional()
        .describe(
          'Whether to notify the customer about the cancellation (for cancel_booking)'
        ),
      notificationMessage: z
        .string()
        .optional()
        .describe('Custom message sent to the customer (for cancel_booking)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter object for list operations'),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list operations'),
      limit: z.number().optional().describe('Max items to return (max 100)'),
      offset: z
        .number()
        .optional()
        .describe('Number of items to skip (for list_services only)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous nextCursor (for list_bookings only)')
    })
  )
  .output(
    z.object({
      service: z.any().optional().describe('Single service data'),
      services: z.array(z.any()).optional().describe('List of services'),
      booking: z.any().optional().describe('Single booking data'),
      bookings: z.array(z.any()).optional().describe('List of bookings'),
      totalResults: z.number().optional().describe('Total number of results'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page of bookings (list_bookings)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list_services': {
        let result = await client.queryServices({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        let services = result.services || [];
        return {
          output: { services, totalResults: result.pagingMetadata?.total },
          message: `Found **${services.length}** booking services`
        };
      }
      case 'get_service': {
        if (!ctx.input.serviceId)
          throw createApiServiceError('serviceId is required for get_service action');
        let result = await client.getService(ctx.input.serviceId);
        return {
          output: { service: result.service },
          message: `Retrieved service **${result.service?.name || ctx.input.serviceId}**`
        };
      }
      case 'list_bookings': {
        if (ctx.input.offset !== undefined) {
          throw createApiServiceError(
            'list_bookings uses cursor paging. Remove offset and pass cursor from nextCursor instead.'
          );
        }
        let result = await client.queryExtendedBookings({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let bookings = (result.extendedBookings || [])
          .map((extended: Record<string, any>) => extended?.booking)
          .filter(Boolean);
        let nextCursor = getNextCursor(result);
        return {
          output: { bookings, totalResults: result.pagingMetadata?.total, nextCursor },
          message: `Found **${bookings.length}** bookings${nextCursor ? ' (more available)' : ''}`
        };
      }
      case 'get_booking': {
        if (!ctx.input.bookingId)
          throw createApiServiceError('bookingId is required for get_booking action');
        let booking = await client.getBooking(ctx.input.bookingId);
        return {
          output: { booking },
          message: `Retrieved booking **${ctx.input.bookingId}** (status: ${booking.status || 'unknown'})`
        };
      }
      case 'create_booking': {
        if (!ctx.input.bookingData)
          throw createApiServiceError('bookingData is required for create_booking action');
        let body =
          ctx.input.bookingData.booking && typeof ctx.input.bookingData.booking === 'object'
            ? ctx.input.bookingData
            : { booking: ctx.input.bookingData };
        let result = await client.createBooking(body);
        return {
          output: { booking: result.booking },
          message: `Created booking **${result.booking?.id}**`
        };
      }
      case 'cancel_booking': {
        if (!ctx.input.bookingId)
          throw createApiServiceError('bookingId is required for cancel_booking action');
        let revision = ctx.input.revision;
        if (revision === undefined) {
          let current = await client.getBooking(ctx.input.bookingId);
          revision = current.revision;
        }
        if (revision === undefined || revision === null) {
          throw createApiServiceError(
            'The booking revision could not be determined. Pass revision from get_booking.'
          );
        }
        let notify =
          ctx.input.notifyParticipants !== undefined ||
          ctx.input.notificationMessage !== undefined
            ? {
                notifyParticipants: ctx.input.notifyParticipants,
                message: ctx.input.notificationMessage
              }
            : undefined;
        let result = await client.cancelBooking(ctx.input.bookingId, {
          revision: String(revision),
          ...(notify ? { participantNotification: notify } : {})
        });
        return {
          output: { booking: result.booking },
          message: `Canceled booking **${ctx.input.bookingId}** (status: ${result.booking?.status || 'unknown'})`
        };
      }
    }
  })
  .build();
