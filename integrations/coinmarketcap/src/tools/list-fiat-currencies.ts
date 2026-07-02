import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fiatEntrySchema = z.object({
  fiatId: z.number().describe('CoinMarketCap fiat currency ID'),
  name: z.string().describe('Full name of the fiat currency'),
  sign: z.string().describe('Currency sign/symbol (e.g., "$", "€")'),
  symbol: z.string().describe('ISO 4217 currency code (e.g., "USD", "EUR")')
});

export let listFiatCurrencies = SlateTool.create(spec, {
  name: 'List Fiat Currencies',
  key: 'list_fiat_currencies',
  description: `List all supported fiat currencies and precious metals with their names, symbols, and signs. Useful for discovering valid currency codes to use as conversion targets in other API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination (1-based)'),
      limit: z.number().optional().describe('Number of results to return'),
      sort: z.enum(['id', 'name']).optional().describe('Sort field. Default: id'),
      includeMetals: z
        .boolean()
        .optional()
        .describe('Include precious metals (gold, silver, etc.). Default: false')
    })
  )
  .output(
    z.object({
      currencies: z.array(fiatEntrySchema).describe('List of supported fiat currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let entries = await client.getFiatMap({
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      includeMetals: ctx.input.includeMetals
    });

    let currencies = entries.map(entry => ({
      fiatId: entry.id,
      name: entry.name,
      sign: entry.sign,
      symbol: entry.symbol
    }));

    return {
      output: { currencies },
      message: `Found **${currencies.length}** supported fiat currencies${ctx.input.includeMetals ? ' and precious metals' : ''}.`
    };
  })
  .build();
