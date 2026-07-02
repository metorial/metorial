import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description: `Convert an amount from one currency to another using real-time mid-market exchange rates. The conversion is performed server-side for accuracy.
Optionally specify a historical date to convert using rates from that date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromCurrency: z.string().describe('Source currency code (e.g., USD)'),
      toCurrency: z.string().describe('Target currency code (e.g., EUR)'),
      amount: z.number().describe('Amount to convert'),
      date: z
        .string()
        .optional()
        .describe(
          'Optional historical date in YYYY-MM-DD format for conversion using historical rates'
        )
    })
  )
  .output(
    z.object({
      fromCurrency: z.string().describe('Source currency code'),
      toCurrency: z.string().describe('Target currency code'),
      amount: z.number().describe('Original amount that was converted'),
      convertedAmount: z.number().describe('Resulting amount after conversion'),
      date: z.string().describe('Date of the exchange rate used for conversion'),
      timestamp: z.number().describe('Unix timestamp of the exchange rate used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.convert({
      from: ctx.input.fromCurrency,
      to: ctx.input.toCurrency,
      amount: ctx.input.amount,
      date: ctx.input.date
    });

    return {
      output: {
        fromCurrency: result.from,
        toCurrency: result.to,
        amount: result.amount,
        convertedAmount: result.value,
        date: result.date,
        timestamp: result.timestamp
      },
      message: `Converted **${result.amount} ${result.from}** to **${result.value} ${result.to}** using rates from ${result.date}.`
    };
  })
  .build();
