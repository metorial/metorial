import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { decimalString, optionalNumber, requiredString } from '../lib/response';
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
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      symbol: z.string().describe('Currency pair'),
      rate: z.string().describe('Exchange rate used'),
      amount: z
        .number()
        .describe('Original amount supplied in the request, not a returned provider field'),
      convertedAmount: z.string().describe('Converted amount'),
      timestamp: z.number().optional().describe('Unix timestamp of the rate in seconds')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.amount < 0)
      throw createApiServiceError('The amount to convert must be zero or greater.', {
        reason: 'invalid_conversion_amount'
      });
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.convertCurrency({
      symbol: ctx.input.symbol,
      amount: ctx.input.amount,
      dp: ctx.input.decimalPlaces
    });

    return {
      output: {
        raw: result,
        symbol: requiredString(result.symbol, 'symbol'),
        rate: decimalString(result.rate, 'rate'),
        amount: ctx.input.amount,
        convertedAmount: decimalString(result.amount, 'converted amount'),
        timestamp: optionalNumber(result.timestamp)
      },
      message: `Converted **${ctx.input.amount} ${ctx.input.symbol.split('/')[0]}** → **${result.amount} ${ctx.input.symbol.split('/')[1]}** (rate: ${result.rate})`
    };
  })
  .build();
