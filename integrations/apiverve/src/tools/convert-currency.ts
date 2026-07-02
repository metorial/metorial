import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertCurrency = SlateTool.create(spec, {
  name: 'Convert Currency',
  key: 'convert_currency',
  description: `Convert an amount between currencies using real-time exchange rates. Supports 170+ currencies via ISO 4217 codes. Returns the converted value, exchange rate, and 24-hour rate change information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      amount: z.number().describe('The amount to convert'),
      fromCurrency: z
        .string()
        .describe('Source currency ISO 4217 code (e.g. "USD", "EUR", "GBP")'),
      toCurrency: z
        .string()
        .describe('Target currency ISO 4217 code (e.g. "EUR", "JPY", "CAD")')
    })
  )
  .output(
    z.object({
      fromCurrency: z.string().describe('Source currency code'),
      toCurrency: z.string().describe('Target currency code'),
      originalAmount: z.number().describe('Original amount'),
      convertedAmount: z.number().describe('Converted amount'),
      exchangeRate: z.number().describe('Exchange rate used'),
      changeDirection: z
        .string()
        .optional()
        .describe('Rate change direction (up/down/unchanged)'),
      change24hPercent: z.number().optional().describe('24-hour rate change percentage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.convertCurrency(
      ctx.input.amount,
      ctx.input.fromCurrency,
      ctx.input.toCurrency
    );

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Currency conversion failed');
    }

    let data = result.data;
    let output = {
      fromCurrency: data.from,
      toCurrency: data.to,
      originalAmount: data.value,
      convertedAmount: data.convertedValue,
      exchangeRate: data.rate,
      changeDirection: data.changeDirection,
      change24hPercent: data.change24hPct
    };

    return {
      output,
      message: `**${ctx.input.amount} ${data.from}** = **${data.convertedValue} ${data.to}** (rate: ${data.rate}).`
    };
  })
  .build();
