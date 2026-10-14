import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let getReservation = SlateTool.create(spec, {
  name: 'Get Reservation',
  key: 'get_reservation',
  description: `Retrieve full details of a specific reservation by its ID. Returns comprehensive information including guest details, stay dates, room assignment, pricing, services, and current status.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      reservationId: z.string().describe('The reservation ID to retrieve')
    })
  )
  .output(
    z
      .object({
        reservationId: z.string().describe('Unique reservation ID'),
        bookingId: z.string().optional().describe('Associated booking ID'),
        status: z.string().optional().describe('Current reservation status'),
        arrival: z.string().optional().describe('Arrival date'),
        departure: z.string().optional().describe('Departure date'),
        adults: z.number().optional().describe('Number of adults'),
        childrenAges: z.array(z.number()).optional().describe('Ages of children'),
        primaryGuest: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
          })
          .optional()
          .describe('Primary guest'),
        booker: z
          .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional()
          })
          .optional()
          .describe('Booker information'),
        property: z
          .object({
            propertyId: z.string().optional(),
            name: z.string().optional()
          })
          .optional(),
        unitGroup: z
          .object({
            unitGroupId: z.string().optional(),
            name: z.string().optional()
          })
          .optional(),
        unit: z
          .object({
            unitId: z.string().optional(),
            name: z.string().optional()
          })
          .optional(),
        totalGrossAmount: z
          .object({
            amount: z.number().optional(),
            currency: z.string().optional()
          })
          .optional(),
        balance: z
          .object({
            amount: z.number().optional(),
            currency: z.string().optional()
          })
          .optional(),
        guaranteeType: z.string().optional(),
        channelCode: z.string().optional(),
        travelPurpose: z.string().optional(),
        comment: z.string().optional(),
        guestComment: z.string().optional(),
        companyId: z.string().optional(),
        corporateCode: z.string().optional(),
        cancellationFee: z
          .object({
            amount: z.number().optional(),
            currency: z.string().optional()
          })
          .optional(),
        noShowFee: z
          .object({
            amount: z.number().optional(),
            currency: z.string().optional()
          })
          .optional(),
        created: z.string().optional(),
        modified: z.string().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let r = await client.getReservation(ctx.input.reservationId, ['booker', 'company']);

    let output = {
      reservationId: r.id ?? undefined,
      bookingId: r.bookingId ?? undefined,
      status: r.status ?? undefined,
      arrival: r.arrival ?? undefined,
      departure: r.departure ?? undefined,
      adults: r.adults ?? undefined,
      childrenAges: r.childrenAges ?? undefined,
      primaryGuest:
        (r.primaryGuest ?? undefined)
          ? {
              firstName: r.primaryGuest.firstName ?? undefined,
              lastName: r.primaryGuest.lastName ?? undefined,
              email: r.primaryGuest.email ?? undefined,
              phone: r.primaryGuest.phone ?? undefined
            }
          : undefined,
      booker:
        (r.booker ?? undefined)
          ? {
              firstName: r.booker.firstName ?? undefined,
              lastName: r.booker.lastName ?? undefined,
              email: r.booker.email ?? undefined
            }
          : undefined,
      property: r.property
        ? { propertyId: r.property.id ?? undefined, name: r.property.name ?? undefined }
        : undefined,
      unitGroup:
        (r.unitGroup ?? undefined)
          ? { unitGroupId: r.unitGroup.id ?? undefined, name: r.unitGroup.name ?? undefined }
          : undefined,
      unit: r.unit
        ? { unitId: r.unit.id ?? undefined, name: r.unit.name ?? undefined }
        : undefined,
      totalGrossAmount: r.totalGrossAmount ?? undefined,
      balance: r.balance ?? undefined,
      guaranteeType: r.guaranteeType ?? undefined,
      channelCode: r.channelCode ?? undefined,
      travelPurpose: r.travelPurpose ?? undefined,
      comment: r.comment ?? undefined,
      guestComment: r.guestComment ?? undefined,
      companyId: r.company?.id,
      corporateCode: r.corporateCode ?? undefined,
      cancellationFee: r.cancellationFee?.fee ?? r.cancellationFee,
      noShowFee: r.noShowFee?.fee ?? r.noShowFee,
      created: r.created ?? undefined,
      modified: r.modified ?? undefined
    };

    let guestName =
      [r.primaryGuest?.firstName, r.primaryGuest?.lastName].filter(Boolean).join(' ') ||
      'Unknown guest';

    return {
      output,
      message: `Reservation **${r.id}** for **${guestName}**: ${r.arrival} → ${r.departure}, status **${r.status}**.`
    };
  })
  .build();
