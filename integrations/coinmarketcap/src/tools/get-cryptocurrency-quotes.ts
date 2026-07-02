import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let quoteSchema = z.object({
  price: z.number().nullable().describe('Current price'),
  volume24h: z.number().nullable().describe('24-hour trading volume'),
  volumeChange24h: z.number().nullable().describe('24-hour volume change percentage'),
  percentChange1h: z.number().nullable().describe('1-hour percent change'),
  percentChange24h: z.number().nullable().describe('24-hour percent change'),
  percentChange7d: z.number().nullable().describe('7-day percent change'),
  percentChange30d: z.number().nullable().describe('30-day percent change'),
  marketCap: z.number().nullable().describe('Market capitalization'),
  marketCapDominance: z.number().nullable().describe('Market cap dominance percentage'),
  fullyDilutedMarketCap: z.number().nullable().describe('Fully diluted market cap'),
  lastUpdated: z.string().nullable().describe('Last updated timestamp')
});

let cryptocurrencyQuoteSchema = z.object({
  cryptocurrencyId: z.number().describe('CoinMarketCap cryptocurrency ID'),
  name: z.string().describe('Cryptocurrency name'),
  symbol: z.string().describe('Cryptocurrency ticker symbol'),
  slug: z.string().describe('URL-friendly slug'),
  cmcRank: z.number().describe('CoinMarketCap ranking'),
  numMarketPairs: z.number().describe('Number of active market pairs'),
  circulatingSupply: z.number().nullable().describe('Circulating supply'),
  totalSupply: z.number().nullable().describe('Total supply'),
  maxSupply: z.number().nullable().describe('Maximum supply'),
  isActive: z.number().describe('Whether the cryptocurrency is active (1) or not (0)'),
  lastUpdated: z.string().describe('Last updated timestamp'),
  dateAdded: z.string().describe('Date added to CoinMarketCap'),
  quote: z.record(z.string(), quoteSchema).describe('Market quote data keyed by currency')
});

export let getCryptocurrencyQuotes = SlateTool.create(spec, {
  name: 'Get Cryptocurrency Quotes',
  key: 'get_cryptocurrency_quotes',
  description: `Retrieve the latest market quotes for one or more specific cryptocurrencies. Returns current price, volume, market cap, and percentage changes. Cryptocurrencies can be identified by CoinMarketCap ID, symbol, or slug.`,
  instructions: [
    'Provide at least one of: cryptocurrencyIds, symbols, or slugs.',
    'Multiple values can be comma-separated (e.g., symbols: "BTC,ETH,SOL").',
    'When using symbols, the API defaults to the highest market cap match. Use cryptocurrencyIds for precision.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cryptocurrencyIds: z
        .string()
        .optional()
        .describe('Comma-separated CoinMarketCap IDs (e.g., "1,1027")'),
      symbols: z.string().optional().describe('Comma-separated symbols (e.g., "BTC,ETH")'),
      slugs: z
        .string()
        .optional()
        .describe('Comma-separated slugs (e.g., "bitcoin,ethereum")'),
      convert: z
        .string()
        .optional()
        .describe('Target currency for quotes (e.g., "USD", "EUR", "BTC"). Default: USD')
    })
  )
  .output(
    z.object({
      cryptocurrencies: z
        .array(cryptocurrencyQuoteSchema)
        .describe('List of cryptocurrency quotes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let data = await client.getCryptocurrencyQuotesLatest({
      id: ctx.input.cryptocurrencyIds,
      slug: ctx.input.slugs,
      symbol: ctx.input.symbols,
      convert: ctx.input.convert
    });

    let cryptocurrencies: z.infer<typeof cryptocurrencyQuoteSchema>[] = [];
    for (let [, value] of Object.entries(data)) {
      let items = Array.isArray(value) ? value : [value];
      for (let item of items) {
        cryptocurrencies.push({
          cryptocurrencyId: item.id,
          name: item.name,
          symbol: item.symbol,
          slug: item.slug,
          cmcRank: item.cmcRank,
          numMarketPairs: item.numMarketPairs,
          circulatingSupply: item.circulatingSupply,
          totalSupply: item.totalSupply,
          maxSupply: item.maxSupply,
          isActive: item.isActive,
          lastUpdated: item.lastUpdated,
          dateAdded: item.dateAdded,
          quote: item.quote || {}
        });
      }
    }

    let names = cryptocurrencies.map(c => `**${c.name}** (${c.symbol})`).join(', ');
    let message =
      cryptocurrencies.length > 0
        ? `Retrieved quotes for ${cryptocurrencies.length} cryptocurrency(ies): ${names}.`
        : `No quotes found for the specified cryptocurrencies.`;

    return {
      output: { cryptocurrencies },
      message
    };
  })
  .build();
