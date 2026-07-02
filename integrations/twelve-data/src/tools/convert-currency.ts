import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description: `Convert a specified amount from one currency to another using real-time exchange rates.
Supports both fiat and cryptocurrency conversions.`,
  instructions: ['Use currency pair format like "EUR/USD", "BTC/USD".'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Currency pair (e.g., "EUR/USD", "BTC/ETH")'),
      amount: z.number().describe('Amount to convert'),
      decimalPlaces: z.number().optional().describe('Number of decimal places for the result')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Currency pair'),
      rate: z.string().describe('Exchange rate used'),
      amount: z.number().describe('Original amount'),
      convertedAmount: z.string().describe('Converted amount'),
      timestamp: z.number().optional().describe('Unix timestamp of the rate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.convertCurrency({
      symbol: ctx.input.symbol,
      amount: ctx.input.amount,
      dp: ctx.input.decimalPlaces
    });

    return {
      output: {
        symbol: result.symbol || ctx.input.symbol,
        rate: result.rate,
        amount: result.amount || ctx.input.amount,
        convertedAmount: result.result,
        timestamp: result.timestamp
      },
      message: `Converted **${ctx.input.amount} ${ctx.input.symbol.split('/')[0]}** → **${result.result} ${ctx.input.symbol.split('/')[1]}** (rate: ${result.rate})`
    };
  })
  .build();
