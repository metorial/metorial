import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMarketData = SlateTool.create(spec, {
  name: 'Electricity Market Data',
  key: 'get_market_data',
  description: `Retrieves real-time and forecasted electricity pricing data for a German location. Returns time-stamped pricing intervals with market-level prices in EUR/MWh, compatible with the awattar API format. Useful for cost optimization and energy trading decisions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits')
    })
  )
  .output(
    z.object({
      prices: z
        .array(
          z.object({
            startTimestamp: z.number().describe('Start of pricing interval (milliseconds)'),
            endTimestamp: z.number().describe('End of pricing interval (milliseconds)'),
            marketPrice: z.number().describe('Regional green power price in EUR per MWh')
          })
        )
        .describe('Time-stamped electricity pricing intervals')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getMarketData({ zip });

    let prices = (result.data || []).map(item => ({
      startTimestamp: item.start_timestamp,
      endTimestamp: item.end_timestamp,
      marketPrice: item.marketprice
    }));

    return {
      output: { prices },
      message: `Retrieved **${prices.length}** pricing intervals for postal code **${zip}**.`
    };
  })
  .build();
