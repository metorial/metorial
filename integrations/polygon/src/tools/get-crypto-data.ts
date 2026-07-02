import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getCryptoData = SlateTool.create(spec, {
  name: 'Get Crypto Snapshot',
  key: 'get_crypto_data',
  description: `Retrieve current market snapshots for one or more cryptocurrency tickers. Returns current day bar, previous day bar, last trade, last quote, and daily price change. Crypto tickers use the \`X:\` prefix (e.g., \`X:BTCUSD\`).`,
  instructions: [
    'Use the X: prefix for crypto tickers (e.g., X:BTCUSD, X:ETHUSD).',
    'Provide a comma-separated list for multiple tickers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of crypto tickers with X: prefix (e.g., "X:BTCUSD" or "X:BTCUSD,X:ETHUSD"). Leave empty for all crypto tickers.'
        )
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(
          z.object({
            ticker: z.string().optional().describe('Crypto ticker'),
            todaysChange: z.number().optional().describe('Absolute price change'),
            todaysChangePercent: z.number().optional().describe('Percentage price change'),
            day: z
              .object({
                open: z.number().optional(),
                high: z.number().optional(),
                low: z.number().optional(),
                close: z.number().optional(),
                volume: z.number().optional(),
                volumeWeightedAvgPrice: z.number().optional()
              })
              .optional()
              .describe('Current day aggregate'),
            prevDay: z
              .object({
                open: z.number().optional(),
                high: z.number().optional(),
                low: z.number().optional(),
                close: z.number().optional(),
                volume: z.number().optional(),
                volumeWeightedAvgPrice: z.number().optional()
              })
              .optional()
              .describe('Previous day aggregate'),
            lastTrade: z
              .object({
                price: z.number().optional(),
                size: z.number().optional(),
                timestamp: z.number().optional(),
                exchange: z.number().optional(),
                conditions: z.array(z.number()).optional()
              })
              .optional()
              .describe('Last trade')
          })
        )
        .describe('Crypto ticker snapshots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let tickerInput = ctx.input.tickers?.trim();

    let mapBar = (bar: any) =>
      bar
        ? {
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v,
            volumeWeightedAvgPrice: bar.vw
          }
        : undefined;

    if (tickerInput && !tickerInput.includes(',')) {
      let response = await client.getCryptoSnapshot(tickerInput);
      let t = response.ticker;
      let snapshots = t
        ? [
            {
              ticker: t.ticker,
              todaysChange: t.todaysChange,
              todaysChangePercent: t.todaysChangePerc,
              day: mapBar(t.day),
              prevDay: mapBar(t.prevDay),
              lastTrade: t.lastTrade
                ? {
                    price: t.lastTrade.p,
                    size: t.lastTrade.s,
                    timestamp: t.lastTrade.t,
                    exchange: t.lastTrade.x,
                    conditions: t.lastTrade.c
                  }
                : undefined
            }
          ]
        : [];

      return {
        output: { snapshots },
        message: `Retrieved snapshot for **${tickerInput}**.`
      };
    }

    let response = await client.getAllCryptoSnapshots({
      tickers: tickerInput || undefined
    });

    let snapshots = (response.tickers || []).map((t: any) => ({
      ticker: t.ticker,
      todaysChange: t.todaysChange,
      todaysChangePercent: t.todaysChangePerc,
      day: mapBar(t.day),
      prevDay: mapBar(t.prevDay),
      lastTrade: t.lastTrade
        ? {
            price: t.lastTrade.p,
            size: t.lastTrade.s,
            timestamp: t.lastTrade.t,
            exchange: t.lastTrade.x,
            conditions: t.lastTrade.c
          }
        : undefined
    }));

    return {
      output: { snapshots },
      message: `Retrieved **${snapshots.length}** crypto snapshots.`
    };
  })
  .build();
