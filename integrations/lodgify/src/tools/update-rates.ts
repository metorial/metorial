import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRates = SlateTool.create(spec, {
  name: 'Update Rates',
  key: 'update_rates',
  description: `Update pricing rates for a specific room type at a property. Set daily, weekly, and monthly rates for date ranges. Can also set minimum stay requirements per period.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'At least one date range with a daily rate is required.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property/house ID'),
      roomTypeId: z.number().describe('The room type ID to update rates for'),
      dateRanges: z
        .array(
          z.object({
            startDate: z.string().describe('Start date of the rate period (YYYY-MM-DD)'),
            endDate: z.string().describe('End date of the rate period (YYYY-MM-DD)'),
            dailyRate: z.number().describe('Nightly rate amount'),
            weeklyRate: z.number().optional().describe('Weekly rate amount (if applicable)'),
            monthlyRate: z.number().optional().describe('Monthly rate amount (if applicable)'),
            minStay: z.number().optional().describe('Minimum number of nights for this period')
          })
        )
        .min(1)
        .describe('Rate periods to set')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the rates were updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateRates({
      house_id: ctx.input.propertyId,
      room_type_id: ctx.input.roomTypeId,
      date_ranges: ctx.input.dateRanges.map(dr => ({
        start_date: dr.startDate,
        end_date: dr.endDate,
        daily: dr.dailyRate,
        weekly: dr.weeklyRate,
        monthly: dr.monthlyRate,
        min_stay: dr.minStay
      }))
    });

    return {
      output: { success: true },
      message: `Updated **${ctx.input.dateRanges.length}** rate period(s) for room type **#${ctx.input.roomTypeId}** at property **#${ctx.input.propertyId}**.`
    };
  })
  .build();
