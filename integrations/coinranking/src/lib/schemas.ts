import { createApiServiceError } from 'slates';
import { z } from 'zod';

let identifier = z.string().refine(value => value.trim().length > 0);
let nullableString = z.string().nullish();

export let paginationSchema = z.object({
  limit: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  nextCursor: z.string().nullable(),
  previousCursor: z.string().nullable()
});

export let rawDataSchema = z.record(z.string(), z.unknown());
export let timePeriodSchema = z.enum([
  '1h',
  '3h',
  '12h',
  '24h',
  '7d',
  '30d',
  '3m',
  '1y',
  '3y',
  '5y'
]);

export let coinResponseSchema = z
  .object({
    uuid: identifier,
    symbol: identifier,
    name: identifier,
    iconUrl: nullableString,
    price: nullableString,
    marketCap: nullableString,
    '24hVolume': nullableString,
    change: nullableString,
    rank: z.number().nullish(),
    btcPrice: nullableString,
    lowVolume: z.boolean().nullish()
  })
  .passthrough();

export let coinsResponseSchema = z
  .object({
    coins: z.array(coinResponseSchema),
    stats: z.object({ total: z.number() }).passthrough()
  })
  .passthrough();

export let trendingResponseSchema = z
  .object({
    coins: z.array(coinResponseSchema),
    stats: z.object({ total: z.number() }).passthrough().optional()
  })
  .passthrough();

export let coinDetailsResponseSchema = z
  .object({
    coin: coinResponseSchema
      .extend({
        description: nullableString,
        color: nullableString,
        websiteUrl: nullableString,
        fullyDilutedMarketCap: nullableString,
        numberOfMarkets: z.number().nullish(),
        numberOfExchanges: z.number().nullish(),
        supply: z
          .object({
            confirmed: z.boolean().nullish(),
            supplyAt: z.number().nullish(),
            circulating: nullableString,
            total: nullableString,
            max: nullableString
          })
          .passthrough(),
        allTimeHigh: z
          .object({
            price: nullableString,
            timestamp: z.number().nullish()
          })
          .passthrough(),
        links: z.array(
          z.object({ name: z.string(), url: identifier, type: identifier }).passthrough()
        ),
        tags: z.array(z.union([identifier, z.object({ name: identifier }).passthrough()]))
      })
      .passthrough()
  })
  .passthrough();

export let priceResponseSchema = z
  .object({ price: identifier, timestamp: z.number() })
  .passthrough();
export let historyResponseSchema = z
  .object({
    change: nullableString,
    history: z.array(z.object({ price: nullableString, timestamp: z.number() }).passthrough())
  })
  .passthrough();

let highlightSchema = z
  .object({
    uuid: identifier,
    symbol: identifier,
    name: identifier,
    iconUrl: nullableString
  })
  .passthrough();
export let statsResponseSchema = z
  .object({
    totalCoins: z.number(),
    totalMarkets: z.number(),
    totalExchanges: z.number(),
    totalMarketCap: identifier,
    total24hVolume: identifier,
    btcDominance: z.number(),
    bestCoins: z.array(highlightSchema),
    newestCoins: z.array(highlightSchema)
  })
  .passthrough();

export let currenciesResponseSchema = z
  .object({
    stats: z.object({ total: z.number() }).passthrough(),
    currencies: z.array(
      z
        .object({
          uuid: identifier,
          type: identifier,
          symbol: identifier,
          name: identifier,
          iconUrl: nullableString,
          sign: nullableString
        })
        .passthrough()
    )
  })
  .passthrough();

export let searchResponseSchema = z
  .object({
    coins: z.array(coinResponseSchema),
    exchanges: z.array(
      z
        .object({
          uuid: identifier,
          name: identifier,
          iconUrl: nullableString,
          recommended: z.boolean().nullish()
        })
        .passthrough()
    ),
    markets: z.array(
      z
        .object({
          uuid: identifier,
          baseSymbol: identifier,
          quoteSymbol: identifier,
          exchangeName: nullableString,
          exchangeIconUrl: nullableString
        })
        .passthrough()
    )
  })
  .passthrough();

export let tagSchema = z
  .object({
    slug: identifier,
    shortname: z.string(),
    name: identifier,
    type: z.string(),
    description: z.string().nullish(),
    iconUrl: nullableString,
    numberOfCoins: z.number(),
    '24hVolume': nullableString,
    marketCap: nullableString,
    marketCapChange: nullableString,
    topCurrencySymbol: nullableString,
    topCurrencyMarketCap: nullableString,
    topCurrencyDominance: nullableString,
    coinrankingUrl: nullableString
  })
  .passthrough();
export let tagsResponseSchema = z
  .object({
    stats: z.object({ total: z.number() }).passthrough(),
    tags: z.array(tagSchema)
  })
  .passthrough();

export let parseCoinrankingResponse = <T extends z.ZodType>(
  schema: T,
  value: unknown
): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    let fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(
      `Coinranking returned invalid or incomplete response data (${fields}).`,
      {
        reason: 'coinranking_invalid_response'
      }
    );
  }
  return parsed.data;
};
