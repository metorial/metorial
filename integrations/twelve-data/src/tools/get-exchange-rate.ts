import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { decimalString, optionalNumber, requiredString } from '../lib/response';
import { spec } from '../spec';

export let getExchangeRate = SlateTool.create(spec, {
  name: 'Get Exchange Rate',
  key: 'get_exchange_rate',
  description: `Retrieve the real-time exchange rate between two currencies (forex or cryptocurrency).
Use this to check the current rate between any currency pair.`,
  instructions: ['Use currency pair format like "EUR/USD", "BTC/USD", "GBP/JPY".'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Currency pair (e.g., "EUR/USD", "BTC/USD", "GBP/JPY")'),
      decimalPlaces: z.number().optional().describe('Number of decimal places for the rate'),
      timezone: z.string().optional().describe('Timezone for the timestamp')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      symbol: z.string().describe('Currency pair'),
      rate: z.string().describe('Current exchange rate'),
      timestamp: z.number().optional().describe('Unix timestamp in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getExchangeRate({
      symbol: ctx.input.symbol,
      dp: ctx.input.decimalPlaces,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        raw: result,
        symbol: requiredString(result.symbol, 'symbol'),
        rate: decimalString(result.rate, 'rate'),
        timestamp: optionalNumber(result.timestamp)
      },
      message: `Exchange rate for **${ctx.input.symbol}**: ${result.rate}`
    };
  })
  .build();
