import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAvailability = SlateTool.create(spec, {
  name: 'Get Availability',
  key: 'get_availability',
  description: `Check availability for a property or a specific room type over a date range. Returns the calendar as periods, each with the number of units still available and any bookings or closed periods covering it. Optionally narrow results to a single room type.`,
  instructions: [
    'Dates can be given as YYYY-MM-DD or a full ISO 8601 datetime.',
    'Leaving startDate and endDate unset returns the whole calendar the provider holds, which can be large. Set both when checking specific dates.',
    'A period with available set to 0 has no units left for those dates.',
    'Set includeDetails to see which bookings occupy a period; without it the bookings list is not populated.',
    'Use update_availability to change unit counts.'
  ],
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
        .describe('Start date of the calendar period (YYYY-MM-DD or ISO 8601 datetime)'),
      endDate: z
        .string()
        .optional()
        .describe('End date of the calendar period (YYYY-MM-DD or ISO 8601 datetime)'),
      includeDetails: z
        .boolean()
        .optional()
        .describe(
          'Include detailed booking status information on each period, which populates the bookings entries. Defaults to false'
        )
    })
  )
  .output(
    z.object({
      availability: z
        .any()
        .describe(
          'Availability calendar as returned by the provider: an array of calendar objects, one per room type, each with user_id, property_id, room_type_id and a periods array'
        ),
      periods: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Every availability period across the returned calendars, each tagged with its room_type_id and carrying start, end, available (the number of units still available), closed_period, bookings and channel_calendars. The bookings entries are only populated when includeDetails is set'
        ),
      roomTypeIds: z
        .array(z.number())
        .describe('Room type IDs covered by the returned calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params = {
      start: ctx.input.startDate,
      end: ctx.input.endDate,
      includeDetails: ctx.input.includeDetails
    };

    let availability: any;
    if (ctx.input.roomTypeId) {
      availability = await client.getRoomAvailability(
        ctx.input.propertyId,
        ctx.input.roomTypeId,
        params
      );
    } else {
      availability = await client.getPropertyAvailability(ctx.input.propertyId, params);
    }

    let calendars: any[] = Array.isArray(availability) ? availability : [availability];
    let periods = calendars.flatMap(calendar =>
      Array.isArray(calendar?.periods)
        ? calendar.periods.map((period: Record<string, any>) => ({
            room_type_id: calendar.room_type_id,
            ...period
          }))
        : []
    );
    let roomTypeIds = [
      ...new Set(
        calendars
          .map(calendar => calendar?.room_type_id)
          .filter((id): id is number => typeof id === 'number')
      )
    ];

    let dateRange =
      ctx.input.startDate && ctx.input.endDate
        ? ` from ${ctx.input.startDate} to ${ctx.input.endDate}`
        : '';
    let roomInfo = ctx.input.roomTypeId ? ` (room type #${ctx.input.roomTypeId})` : '';

    return {
      output: { availability, periods, roomTypeIds },
      message: `Retrieved **${periods.length}** availability period(s) across **${roomTypeIds.length}** room type(s) for property **#${ctx.input.propertyId}**${roomInfo}${dateRange}.`
    };
  })
  .build();
