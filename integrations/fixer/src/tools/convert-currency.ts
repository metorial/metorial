import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description: `Convert an amount from one currency to another using real-time or historical exchange rates. Specify a date to use historical rates for the conversion.`,
  instructions: [
    'Currency codes must be 3-letter ISO 4217 codes (e.g., USD, GBP, JPY).',
    'To use historical rates, provide a date in YYYY-MM-DD format.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Source currency code (e.g., USD)'),
      to: z.string().describe('Target currency code (e.g., EUR)'),
      amount: z.number().describe('Amount to convert'),
      date: z
        .string()
        .optional()
        .describe(
          'Optional date for historical conversion (YYYY-MM-DD). If omitted, uses current rates.'
        )
    })
  )
  .output(
    z.object({
      from: z.string().describe('Source currency code'),
      to: z.string().describe('Target currency code'),
      amount: z.number().describe('Original amount'),
      convertedAmount: z.number().describe('Converted amount in the target currency'),
      rate: z.number().describe('Exchange rate used for the conversion'),
      date: z.string().describe('Date of the exchange rate used'),
      historical: z.boolean().describe('Whether historical rates were used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.convert({
      from: ctx.input.from,
      to: ctx.input.to,
      amount: ctx.input.amount,
      date: ctx.input.date
    });

    return {
      output: {
        from: result.query.from,
        to: result.query.to,
        amount: result.query.amount,
        convertedAmount: result.result,
        rate: result.info.rate,
        date: result.date,
        historical: result.historical
      },
      message: `Converted **${result.query.amount} ${result.query.from}** to **${result.result} ${result.query.to}** at rate ${result.info.rate} (${result.date}).`
    };
  })
  .build();
