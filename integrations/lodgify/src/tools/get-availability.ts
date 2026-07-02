import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailability = SlateTool.create(spec, {
  name: 'Get Availability',
  key: 'get_availability',
  description: `Check availability for a property or specific room type over a date range. Returns calendar data showing which dates are available or booked. Optionally narrow results to a specific room type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property ID to check availability for'),
      roomTypeId: z
        .number()
        .optional()
        .describe('Optional room type ID to narrow availability to a specific room'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for the availability check (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('End date for the availability check (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      availability: z
        .any()
        .describe('Availability calendar data with date ranges and their status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let availability: any;
    if (ctx.input.roomTypeId) {
      availability = await client.getRoomAvailability(
        ctx.input.propertyId,
        ctx.input.roomTypeId,
        { start: ctx.input.startDate, end: ctx.input.endDate }
      );
    } else {
      availability = await client.getPropertyAvailability(ctx.input.propertyId, {
        start: ctx.input.startDate,
        end: ctx.input.endDate
      });
    }

    let dateRange =
      ctx.input.startDate && ctx.input.endDate
        ? ` from ${ctx.input.startDate} to ${ctx.input.endDate}`
        : '';
    let roomInfo = ctx.input.roomTypeId ? ` (room type #${ctx.input.roomTypeId})` : '';

    return {
      output: { availability },
      message: `Retrieved availability for property **#${ctx.input.propertyId}**${roomInfo}${dateRange}.`
    };
  })
  .build();
