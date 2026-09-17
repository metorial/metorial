import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateKeyCodes = SlateTool.create(spec, {
  name: 'Update Key Codes',
  key: 'update_key_codes',
  description: `Set the access codes guests use to enter the rooms of a booking, such as a door PIN or lockbox code. Provide one entry per room type, using the room type IDs that are already on the booking.`,
  instructions: [
    'Use the Get Booking tool first to find the room type IDs on the booking.',
    'The provider does not document how room types left out of the request are treated, so include every room type whose access code you want to be certain about.',
    'The provider returns only the room types and their access codes, not the full booking.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z
        .number()
        .describe('The ID of the booking whose room access codes should be updated'),
      rooms: z
        .array(
          z.object({
            roomTypeId: z.number().describe('Identifier of the room type on the booking'),
            keyCode: z
              .string()
              .optional()
              .describe(
                'Access code the guest uses to enter this room. Omit to send no code for this room type.'
              )
          })
        )
        .min(1)
        .describe('Room types to update, each with the access code to set')
    })
  )
  .output(
    z.object({
      bookingId: z.number().describe('The ID of the booking that was updated'),
      rooms: z
        .array(
          z.object({
            roomTypeId: z.number().optional().describe('Identifier of the room type'),
            keyCode: z
              .string()
              .nullable()
              .optional()
              .describe('Access code held by the room type after the update')
          })
        )
        .describe('Room types and access codes returned by the provider after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateBookingKeyCodes(
      ctx.input.bookingId,
      ctx.input.rooms.map(room => ({
        room_type_id: room.roomTypeId,
        key_code: room.keyCode
      }))
    );

    let rooms = Array.isArray(result?.rooms)
      ? result.rooms.map((room: Record<string, any>) => ({
          roomTypeId: room.room_type_id,
          keyCode: room.key_code ?? null
        }))
      : [];

    return {
      output: {
        bookingId: ctx.input.bookingId,
        rooms
      },
      message: `Updated access codes for **${ctx.input.rooms.length}** room type(s) on booking **#${ctx.input.bookingId}**.`
    };
  })
  .build();
