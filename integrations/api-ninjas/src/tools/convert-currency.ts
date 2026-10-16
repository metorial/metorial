import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description:
    'Convert an amount between two currencies using the provider exchange rate and return its timestamp.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fromCurrency: z.string().length(3).describe('Currency currently held, such as USD'),
      toCurrency: z.string().length(3).describe('Desired currency, such as EUR'),
      amount: z.number().describe('Amount to convert')
    })
  )
  .output(
    z.object({
      fromCurrency: z.string(),
      toCurrency: z.string(),
      amount: z.number(),
      convertedAmount: z.number(),
      timestamp: z.number().optional(),
      raw: z.unknown().optional().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).convertCurrency({
      have: ctx.input.fromCurrency,
      want: ctx.input.toCurrency,
      amount: ctx.input.amount
    });
    return {
      output: {
        fromCurrency: result.old_currency,
        toCurrency: result.new_currency,
        amount: result.old_amount,
        convertedAmount: result.new_amount,
        timestamp: result.timestamp ?? undefined,
        raw: result
      },
      message: `${result.old_amount} ${result.old_currency} converts to ${result.new_amount} ${result.new_currency}.`
    };
  })
  .build();
