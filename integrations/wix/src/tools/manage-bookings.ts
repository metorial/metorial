import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageBookings = SlateTool.create(spec, {
  name: 'Manage Bookings',
  key: 'manage_bookings',
  description: `List bookings services, query bookings, or create new bookings on a Wix site.
Use **action** to specify the operation: \`list_services\`, \`get_service\`, \`list_bookings\`, \`get_booking\`, or \`create_booking\`.
Services represent appointments, classes, or courses. Bookings are customer reservations for services.`,
  instructions: [
    'Use "list_services" to discover available services before creating bookings.',
    'Booking creation requires a service ID and slot information.'
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
          'create_booking'
        ])
        .describe('Operation to perform'),
      serviceId: z.string().optional().describe('Service ID (for get_service)'),
      bookingId: z.string().optional().describe('Booking ID (for get_booking)'),
      bookingData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Booking creation data including serviceId, slot, contactDetails, etc.'),
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
      limit: z.number().optional().describe('Max items to return (default 100)'),
      offset: z.number().optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      service: z.any().optional().describe('Single service data'),
      services: z.array(z.any()).optional().describe('List of services'),
      booking: z.any().optional().describe('Single booking data'),
      bookings: z.array(z.any()).optional().describe('List of bookings'),
      totalResults: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'list_services': {
        let result = await client.queryServices({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
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
        let result = await client.queryBookings({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          paging: { limit: ctx.input.limit, offset: ctx.input.offset }
        });
        let bookings = result.bookings || [];
        return {
          output: { bookings, totalResults: result.pagingMetadata?.total },
          message: `Found **${bookings.length}** bookings`
        };
      }
      case 'get_booking': {
        if (!ctx.input.bookingId)
          throw createApiServiceError('bookingId is required for get_booking action');
        let result = await client.getBooking(ctx.input.bookingId);
        return {
          output: { booking: result.booking },
          message: `Retrieved booking **${ctx.input.bookingId}** (status: ${result.booking?.status || 'unknown'})`
        };
      }
      case 'create_booking': {
        if (!ctx.input.bookingData)
          throw createApiServiceError('bookingData is required for create_booking action');
        let result = await client.createBooking(ctx.input.bookingData);
        return {
          output: { booking: result.booking },
          message: `Created booking **${result.booking?.id}**`
        };
      }
    }
  })
  .build();
