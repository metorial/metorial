import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

let coinResultSchema = z.object({
  coinUuid: z.string().describe('Unique identifier of the coin'),
  symbol: z.string().describe('Ticker symbol (e.g. BTC)'),
  name: z.string().describe('Full name of the coin'),
  iconUrl: z.string().nullable().describe('URL of the coin icon'),
  price: z.string().nullable().describe('Current price in reference currency')
});

let exchangeResultSchema = z.object({
  exchangeUuid: z.string().describe('Unique identifier of the exchange'),
  name: z.string().describe('Name of the exchange'),
  iconUrl: z.string().nullable().describe('URL of the exchange icon'),
  recommended: z.boolean().nullable().describe('Whether the exchange is recommended')
});

let marketResultSchema = z.object({
  marketUuid: z.string().describe('Unique identifier of the market'),
  baseSymbol: z.string().describe('Base currency symbol'),
  quoteSymbol: z.string().describe('Quote currency symbol'),
  exchangeName: z.string().nullable().describe('Name of the exchange'),
  exchangeIconUrl: z.string().nullable().describe('URL of the exchange icon')
});

export let searchCoins = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across coins, exchanges, and markets by name, symbol, or contract address. Returns the most relevant matches from each category. Useful for finding a coin's UUID when you only know its name or symbol.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search term - can be a partial name, symbol, or complete contract address'),
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency to use for price calculations')
    })
  )
  .output(
    z.object({
      coins: z.array(coinResultSchema).describe('Matching cryptocurrencies'),
      exchanges: z.array(exchangeResultSchema).describe('Matching exchanges'),
      markets: z.array(marketResultSchema).describe('Matching markets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.search({
      query: ctx.input.query,
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid
    });

    let data = result.data;

    let coins = (data.coins || []).map((c: any) => ({
      coinUuid: c.uuid,
      symbol: c.symbol,
      name: c.name,
      iconUrl: c.iconUrl || null,
      price: c.price || null
    }));

    let exchanges = (data.exchanges || []).map((e: any) => ({
      exchangeUuid: e.uuid,
      name: e.name,
      iconUrl: e.iconUrl || null,
      recommended: e.recommended ?? null
    }));

    let markets = (data.markets || []).map((m: any) => ({
      marketUuid: m.uuid,
      baseSymbol: m.baseSymbol || '',
      quoteSymbol: m.quoteSymbol || '',
      exchangeName: m.exchangeName || null,
      exchangeIconUrl: m.exchangeIconUrl || null
    }));

    return {
      output: { coins, exchanges, markets },
      message: `Found **${coins.length}** coin(s), **${exchanges.length}** exchange(s), and **${markets.length}** market(s) matching "${ctx.input.query}".`
    };
  })
  .build();
