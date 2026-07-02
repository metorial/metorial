import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAvailability = SlateTool.create(spec, {
  name: 'Update Availability',
  key: 'update_availability',
  description: `Update the availability calendar for a property's room types. Mark specific date ranges as available or unavailable, and optionally set minimum stay requirements. Useful for blocking dates or opening up new availability.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Each period defines a date range and whether it should be available or not.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property ID to update availability for'),
      roomUpdates: z
        .array(
          z.object({
            roomTypeId: z.number().describe('The room type ID to update'),
            periods: z
              .array(
                z.object({
                  startDate: z.string().describe('Start date of the period (YYYY-MM-DD)'),
                  endDate: z.string().describe('End date of the period (YYYY-MM-DD)'),
                  isAvailable: z
                    .boolean()
                    .describe('Whether the room should be available during this period'),
                  minStay: z
                    .number()
                    .optional()
                    .describe('Minimum number of nights for this period')
                })
              )
              .min(1)
              .describe('Date periods to update')
          })
        )
        .min(1)
        .describe('Room type availability updates')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the availability was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = ctx.input.roomUpdates.map(r => ({
      room_type_id: r.roomTypeId,
      periods: r.periods.map(p => ({
        start: p.startDate,
        end: p.endDate,
        is_available: p.isAvailable,
        min_stay: p.minStay
      }))
    }));

    await client.updateAvailability(ctx.input.propertyId, data);

    let totalPeriods = ctx.input.roomUpdates.reduce((sum, r) => sum + r.periods.length, 0);

    return {
      output: { success: true },
      message: `Updated **${totalPeriods}** availability period(s) across **${ctx.input.roomUpdates.length}** room type(s) for property **#${ctx.input.propertyId}**.`
    };
  })
  .build();
