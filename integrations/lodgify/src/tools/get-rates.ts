import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRates = SlateTool.create(spec, {
  name: 'Get Rates',
  key: 'get_rates',
  description: `Retrieve daily nightly rates for a specific room type and date range. Returns the price per night for each day in the range. Can also fetch rate settings/configuration for a property.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property/house ID'),
      roomTypeId: z.number().describe('The room type ID to get rates for'),
      startDate: z.string().describe('Start date for the rate query (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for the rate query (YYYY-MM-DD)'),
      includeSettings: z
        .boolean()
        .optional()
        .describe('Also fetch rate settings/configuration for the property')
    })
  )
  .output(
    z.object({
      dailyRates: z.any().describe('Daily rate data for each day in the range'),
      rateSettings: z.any().optional().describe('Rate settings/configuration for the property')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let dailyRates = await client.getDailyRates({
      houseId: ctx.input.propertyId,
      roomTypeId: ctx.input.roomTypeId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let rateSettings: any;
    if (ctx.input.includeSettings) {
      rateSettings = await client.getRateSettings(ctx.input.propertyId);
    }

    return {
      output: { dailyRates, rateSettings },
      message: `Retrieved rates for room type **#${ctx.input.roomTypeId}** at property **#${ctx.input.propertyId}** from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
