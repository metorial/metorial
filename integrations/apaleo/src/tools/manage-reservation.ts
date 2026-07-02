import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let manageReservation = SlateTool.create(spec, {
  name: 'Manage Reservation',
  key: 'manage_reservation',
  description: `Perform lifecycle actions on a reservation: **amend** stay details (dates, guests, rate plan), **cancel**, **check-in**, **check-out**, **no-show**, **assign room**, or **unassign room**. Choose the action and provide relevant parameters.`,
  instructions: [
    'For "amend", provide only the fields you want to change.',
    'For "assign_unit", provide the unitId of the room to assign.',
    'Check-in requires a unit to be assigned first.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      reservationId: z.string().describe('Reservation ID to act on'),
      action: z
        .enum([
          'amend',
          'cancel',
          'checkin',
          'checkout',
          'noshow',
          'assign_unit',
          'unassign_unit'
        ])
        .describe('Action to perform'),
      arrival: z.string().optional().describe('New arrival date (for amend)'),
      departure: z.string().optional().describe('New departure date (for amend)'),
      adults: z.number().optional().describe('New number of adults (for amend)'),
      childrenAges: z.array(z.number()).optional().describe('New children ages (for amend)'),
      comment: z.string().optional().describe('Updated internal comment (for amend)'),
      guestComment: z.string().optional().describe('Updated guest comment (for amend)'),
      travelPurpose: z.string().optional().describe('Updated travel purpose (for amend)'),
      companyId: z.string().optional().describe('Updated company ID (for amend)'),
      corporateCode: z.string().optional().describe('Updated corporate code (for amend)'),
      unitId: z.string().optional().describe('Room ID to assign (for assign_unit)'),
      timeSlices: z
        .array(
          z.object({
            ratePlanId: z.string(),
            totalAmount: z
              .object({
                amount: z.number(),
                currency: z.string()
              })
              .optional()
          })
        )
        .optional()
        .describe('Updated rate plan time slices (for amend)')
    })
  )
  .output(
    z.object({
      reservationId: z.string().describe('Reservation ID'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let { reservationId, action } = ctx.input;

    switch (action) {
      case 'amend': {
        let amendBody: Record<string, any> = {};
        if (ctx.input.arrival) amendBody.arrival = ctx.input.arrival;
        if (ctx.input.departure) amendBody.departure = ctx.input.departure;
        if (ctx.input.adults !== undefined) amendBody.adults = ctx.input.adults;
        if (ctx.input.childrenAges) amendBody.childrenAges = ctx.input.childrenAges;
        if (ctx.input.comment) amendBody.comment = ctx.input.comment;
        if (ctx.input.guestComment) amendBody.guestComment = ctx.input.guestComment;
        if (ctx.input.travelPurpose) amendBody.travelPurpose = ctx.input.travelPurpose;
        if (ctx.input.companyId) amendBody.companyId = ctx.input.companyId;
        if (ctx.input.corporateCode) amendBody.corporateCode = ctx.input.corporateCode;
        if (ctx.input.timeSlices) amendBody.timeSlices = ctx.input.timeSlices;
        await client.amendReservation(reservationId, amendBody);
        break;
      }
      case 'cancel':
        await client.cancelReservation(reservationId);
        break;
      case 'checkin':
        await client.checkInReservation(reservationId);
        break;
      case 'checkout':
        await client.checkOutReservation(reservationId);
        break;
      case 'noshow':
        await client.noShowReservation(reservationId);
        break;
      case 'assign_unit':
        if (!ctx.input.unitId) throw new Error('unitId is required for assign_unit action');
        await client.assignUnit(reservationId, ctx.input.unitId);
        break;
      case 'unassign_unit':
        await client.unassignUnit(reservationId);
        break;
    }

    let actionLabel: Record<string, string> = {
      amend: 'amended',
      cancel: 'cancelled',
      checkin: 'checked in',
      checkout: 'checked out',
      noshow: 'marked as no-show',
      assign_unit: `assigned to room ${ctx.input.unitId}`,
      unassign_unit: 'room unassigned'
    };

    return {
      output: {
        reservationId,
        action,
        success: true
      },
      message: `Reservation **${reservationId}** ${actionLabel[action]}.`
    };
  })
  .build();
