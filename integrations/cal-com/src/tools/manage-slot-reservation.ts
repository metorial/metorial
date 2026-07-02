import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSlotReservation = SlateTool.create(spec, {
  name: 'Manage Slot Reservation',
  key: 'manage_slot_reservation',
  description: `Reserve, retrieve, update, or delete a temporary slot reservation for a Cal.com event type. Use this before creating a booking when a slot must be held briefly.`,
  instructions: [
    'Use action "reserve" with eventTypeId and slotStart.',
    'Use reservationUid for get, update, and delete actions.',
    'slotDuration is only needed for event types with variable lengths.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['reserve', 'get', 'update', 'delete'])
        .describe('Reservation action to perform'),
      reservationUid: z
        .string()
        .optional()
        .describe('Reservation UID required for get, update, and delete'),
      eventTypeId: z.number().optional().describe('Event type ID required for reserve'),
      slotStart: z
        .string()
        .optional()
        .describe('Slot start time in ISO 8601 UTC format required for reserve/update'),
      slotDuration: z
        .number()
        .optional()
        .describe('Slot duration in minutes for variable-length event types'),
      reservationDuration: z
        .number()
        .optional()
        .describe('How many minutes the slot should remain reserved')
    })
  )
  .output(
    z.object({
      reservation: z.any().optional().describe('Slot reservation details'),
      result: z.any().optional().describe('Result for delete operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    switch (ctx.input.action) {
      case 'reserve': {
        if (ctx.input.eventTypeId === undefined || !ctx.input.slotStart) {
          throw calComServiceError('eventTypeId and slotStart are required for reserve.');
        }

        let body: Record<string, any> = {
          eventTypeId: ctx.input.eventTypeId,
          slotStart: ctx.input.slotStart
        };
        if (ctx.input.slotDuration !== undefined) body.slotDuration = ctx.input.slotDuration;
        if (ctx.input.reservationDuration !== undefined)
          body.reservationDuration = ctx.input.reservationDuration;

        let reservation = await client.reserveSlot(body);
        return {
          output: { reservation },
          message: `Reserved slot starting **${ctx.input.slotStart}**.`
        };
      }
      case 'get': {
        if (!ctx.input.reservationUid) {
          throw calComServiceError('reservationUid is required for get.');
        }

        let reservation = await client.getReservedSlot(ctx.input.reservationUid);
        return {
          output: { reservation },
          message: `Slot reservation **${ctx.input.reservationUid}** retrieved.`
        };
      }
      case 'update': {
        if (!ctx.input.reservationUid) {
          throw calComServiceError('reservationUid is required for update.');
        }

        let body: Record<string, any> = {};
        if (ctx.input.slotStart) body.slotStart = ctx.input.slotStart;
        if (ctx.input.slotDuration !== undefined) body.slotDuration = ctx.input.slotDuration;
        if (ctx.input.reservationDuration !== undefined)
          body.reservationDuration = ctx.input.reservationDuration;
        if (Object.keys(body).length === 0) {
          throw calComServiceError(
            'slotStart, slotDuration, or reservationDuration is required for update.'
          );
        }

        let reservation = await client.updateReservedSlot(ctx.input.reservationUid, body);
        return {
          output: { reservation },
          message: `Slot reservation **${ctx.input.reservationUid}** updated.`
        };
      }
      case 'delete': {
        if (!ctx.input.reservationUid) {
          throw calComServiceError('reservationUid is required for delete.');
        }

        let result = await client.deleteReservedSlot(ctx.input.reservationUid);
        return {
          output: { result },
          message: `Slot reservation **${ctx.input.reservationUid}** deleted.`
        };
      }
    }

    throw calComServiceError(`Unsupported slot reservation action: ${ctx.input.action}`);
  })
  .build();
