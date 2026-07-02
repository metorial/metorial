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
    let r = await client.getReservation(ctx.input.reservationId);

    let output = {
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
            email: r.primaryGuest.email,
            phone: r.primaryGuest.phone
          }
        : undefined,
      booker: r.booker
        ? {
            firstName: r.booker.firstName,
            lastName: r.booker.lastName,
            email: r.booker.email
          }
        : undefined,
      property: r.property ? { propertyId: r.property.id, name: r.property.name } : undefined,
      unitGroup: r.unitGroup
        ? { unitGroupId: r.unitGroup.id, name: r.unitGroup.name }
        : undefined,
      unit: r.unit ? { unitId: r.unit.id, name: r.unit.name } : undefined,
      totalGrossAmount: r.totalGrossAmount,
      balance: r.balance,
      guaranteeType: r.guaranteeType,
      channelCode: r.channelCode,
      travelPurpose: r.travelPurpose,
      comment: r.comment,
      guestComment: r.guestComment,
      companyId: r.company?.id,
      corporateCode: r.corporateCode,
      cancellationFee: r.cancellationFee,
      noShowFee: r.noShowFee,
      created: r.created,
      modified: r.modified
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
