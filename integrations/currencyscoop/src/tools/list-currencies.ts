import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCurrencies = SlateTool.create(spec, {
  name: 'List Currencies',
  key: 'list_currencies',
  description: `Retrieve all supported currencies with their full names, ISO codes, symbols, and formatting details.
Useful for populating dropdowns, validating currency inputs, or discovering available currencies.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      currencies: z
        .array(
          z.object({
            currencyId: z.number().describe('Unique identifier for the currency'),
            name: z
              .string()
              .describe('Full name of the currency (e.g., "United States Dollar")'),
            shortCode: z.string().describe('Short currency code (e.g., "USD")'),
            code: z.string().describe('ISO currency code'),
            precision: z.number().describe('Number of decimal places used'),
            subunit: z.number().describe('Number of subunits in a whole unit'),
            symbol: z.string().describe('Currency symbol (e.g., "$", "€")'),
            symbolFirst: z.boolean().describe('Whether the symbol appears before the amount'),
            decimalMark: z.string().describe('Character used as decimal separator'),
            thousandsSeparator: z.string().describe('Character used as thousands separator')
          })
        )
        .describe('List of all supported currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let currencies = await client.listCurrencies();

    return {
      output: {
        currencies
      },
      message: `Retrieved **${currencies.length}** supported currencies.`
    };
  })
  .build();
