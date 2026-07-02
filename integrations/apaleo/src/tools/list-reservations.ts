import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

let reservationSchema = z
  .object({
    reservationId: z.string().describe('Unique reservation ID'),
    bookingId: z.string().optional().describe('Associated booking ID'),
    status: z
      .string()
      .optional()
      .describe('Reservation status (e.g., Confirmed, InHouse, CheckedOut, Canceled, NoShow)'),
    arrival: z.string().optional().describe('Arrival date'),
    departure: z.string().optional().describe('Departure date'),
    adults: z.number().optional().describe('Number of adults'),
    childrenAges: z.array(z.number()).optional().describe('Ages of children'),
    primaryGuest: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional()
      })
      .optional()
      .describe('Primary guest information'),
    property: z
      .object({
        propertyId: z.string().optional(),
        name: z.string().optional()
      })
      .optional()
      .describe('Property details'),
    unitGroup: z
      .object({
        unitGroupId: z.string().optional(),
        name: z.string().optional()
      })
      .optional()
      .describe('Room type details'),
    unit: z
      .object({
        unitId: z.string().optional(),
        name: z.string().optional()
      })
      .optional()
      .describe('Assigned room'),
    totalGrossAmount: z
      .object({
        amount: z.number().optional(),
        currency: z.string().optional()
      })
      .optional()
      .describe('Total gross amount'),
    channelCode: z.string().optional().describe('Booking channel code'),
    created: z.string().optional().describe('Creation timestamp'),
    modified: z.string().optional().describe('Last modification timestamp')
  })
  .passthrough();

export let listReservations = SlateTool.create(spec, {
  name: 'List Reservations',
  key: 'list_reservations',
  description: `Search and list reservations across properties. Filter by property, status, dates, room types, or text search. Returns paginated results with guest, room, and pricing details.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z.string().optional().describe('Filter by property ID'),
      status: z
        .enum(['Confirmed', 'InHouse', 'CheckedOut', 'Canceled', 'NoShow'])
        .optional()
        .describe('Filter by reservation status'),
      from: z
        .string()
        .optional()
        .describe('Filter reservations arriving from this date (YYYY-MM-DD)'),
      to: z
        .string()
        .optional()
        .describe('Filter reservations arriving until this date (YYYY-MM-DD)'),
      textSearch: z
        .string()
        .optional()
        .describe('Search by guest name, confirmation number, or other text'),
      bookingId: z.string().optional().describe('Filter by booking ID'),
      pageNumber: z.number().optional().describe('Page number for pagination (1-based)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default 100, max 1000)')
    })
  )
  .output(
    z.object({
      reservations: z.array(reservationSchema).describe('List of reservations'),
      count: z.number().describe('Total number of matching reservations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listReservations({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      status: ctx.input.status,
      from: ctx.input.from,
      to: ctx.input.to,
      textSearch: ctx.input.textSearch,
      bookingId: ctx.input.bookingId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let reservations = (result.reservations || []).map((r: any) => ({
      reservationId: r.id,
      bookingId: r.bookingId,
      status: r.status,
      arrival: r.arrival,
      departure: r.departure,
      adults: r.adults,
      childrenAges: r.childrenAges,
      primaryGuest: r.primaryGuest
        ? {
            firstName: r.primaryGuest.firstName,
            lastName: r.primaryGuest.lastName,
            email: r.primaryGuest.email
          }
        : undefined,
      property: r.property ? { propertyId: r.property.id, name: r.property.name } : undefined,
      unitGroup: r.unitGroup
        ? { unitGroupId: r.unitGroup.id, name: r.unitGroup.name }
        : undefined,
      unit: r.unit ? { unitId: r.unit.id, name: r.unit.name } : undefined,
      totalGrossAmount: r.totalGrossAmount,
      channelCode: r.channelCode,
      created: r.created,
      modified: r.modified
    }));

    return {
      output: {
        reservations,
        count: result.count || reservations.length
      },
      message: `Found **${result.count || reservations.length}** reservations${ctx.input.status ? ` with status **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
