import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { paginationSchema, rawDataSchema } from '../lib/schemas';
import { spec } from '../spec';

let referenceCurrencySchema = z.object({
  currencyUuid: z.string().describe('UUID of the reference currency'),
  type: z
    .string()
    .describe('Type of currency (coin, fiat, denominator, commodities, indices, stocks)'),
  symbol: z.string().describe('Currency symbol (e.g. USD, BTC)'),
  name: z.string().describe('Full name of the currency'),
  iconUrl: z.string().nullable().describe('URL of the currency icon'),
  sign: z.string().nullable().describe('Currency sign (e.g. $, \u20ac)')
});

export let listReferenceCurrencies = SlateTool.create(spec, {
  name: 'List Reference Currencies',
  key: 'list_reference_currencies',
  description: `List available reference currencies that can be used for price denominations across all other endpoints. Includes fiat currencies (USD, EUR), crypto (BTC, ETH), denominators (Satoshi), commodities, indices, and stocks. Use this to find the UUID of a currency you want to use as a reference.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter by currency name or symbol'),
      types: z
        .array(
          z.enum(['coin', 'fiat', 'denominator', 'asset', 'commodities', 'indices', 'stocks'])
        )
        .optional()
        .describe(
          'Filter by currency type; legacy asset selects commodities, indices, and stocks'
        ),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100 for free plan, default 20)'),
      offset: z
        .number()
        .optional()
        .describe('Offset for pagination; use cursor for later pages'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Cursor from pagination.nextCursor or pagination.previousCursor; omit offset when provided'
        )
    })
  )
  .output(
    z.object({
      rawData: rawDataSchema
        .optional()
        .describe('Original provider data, including additional fields'),
      pagination: paginationSchema
        .optional()
        .describe('Provider cursor pagination information'),
      currencies: z.array(referenceCurrencySchema).describe('List of reference currencies'),
      totalCurrencies: z.number().describe('Total number of available reference currencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.listReferenceCurrencies({
      search: ctx.input.search,
      types: ctx.input.types,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      cursor: ctx.input.cursor
    });

    let data = result.data;
    let currencies = data.currencies.map(c => ({
      currencyUuid: c.uuid,
      type: c.type,
      symbol: c.symbol,
      name: c.name,
      iconUrl: c.iconUrl ?? null,
      sign: c.sign ?? null
    }));

    return {
      output: {
        rawData: result.data,
        pagination: result.pagination,
        currencies,
        totalCurrencies: data.stats.total
      },
      message: `Found **${currencies.length}** reference currency/ies (${data.stats.total} total).`
    };
  })
  .build();
