import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

export let coinPriceChangeTrigger = SlateTrigger.create(spec, {
  name: 'Coin Price Change',
  key: 'coin_price_change',
  description:
    'Monitors cryptocurrency prices and triggers when a new price is detected. Polls the Coinranking API at regular intervals and emits events with the latest price data for tracked coins.'
})
  .input(
    z.object({
      coinUuid: z.string().describe('UUID of the coin'),
      coinSymbol: z.string().describe('Ticker symbol of the coin'),
      coinName: z.string().describe('Name of the coin'),
      price: z.string().describe('Current price of the coin'),
      change: z.string().nullable().describe('Price change percentage over the period'),
      marketCap: z.string().nullable().describe('Current market capitalization'),
      volume24h: z.string().nullable().describe('24-hour trading volume'),
      rank: z.number().nullable().describe('Current rank by market cap'),
      timestamp: z.number().describe('Timestamp when the price was captured')
    })
  )
  .output(
    z.object({
      coinUuid: z.string().describe('UUID of the coin'),
      coinSymbol: z.string().describe('Ticker symbol of the coin'),
      coinName: z.string().describe('Name of the coin'),
      price: z.string().describe('Current price of the coin'),
      change: z.string().nullable().describe('Price change percentage'),
      marketCap: z.string().nullable().describe('Current market capitalization'),
      volume24h: z.string().nullable().describe('24-hour trading volume'),
      rank: z.number().nullable().describe('Current rank by market cap'),
      timestamp: z.number().describe('Timestamp when the price was captured')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoinrankingClient({
        token: ctx.auth.token,
        referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
      });

      let previousPrices = (ctx.state?.prices as Record<string, string>) || {};

      let result = await client.listCoins({
        limit: 50,
        orderBy: 'marketCap',
        orderDirection: 'desc'
      });

      let coins = result.data?.coins || [];
      let now = Math.floor(Date.now() / 1000);
      let newPrices: Record<string, string> = {};
      let inputs: Array<{
        coinUuid: string;
        coinSymbol: string;
        coinName: string;
        price: string;
        change: string | null;
        marketCap: string | null;
        volume24h: string | null;
        rank: number | null;
        timestamp: number;
      }> = [];

      for (let coin of coins) {
        if (!coin.price) continue;
        newPrices[coin.uuid] = coin.price;

        let prevPrice = previousPrices[coin.uuid];
        if (prevPrice !== coin.price) {
          inputs.push({
            coinUuid: coin.uuid,
            coinSymbol: coin.symbol,
            coinName: coin.name,
            price: coin.price,
            change: coin.change || null,
            marketCap: coin.marketCap || null,
            volume24h: coin['24hVolume'] || null,
            rank: coin.rank ?? null,
            timestamp: now
          });
        }
      }

      return {
        inputs,
        updatedState: {
          prices: newPrices
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'coin.price_changed',
        id: `${ctx.input.coinUuid}-${ctx.input.timestamp}`,
        output: {
          coinUuid: ctx.input.coinUuid,
          coinSymbol: ctx.input.coinSymbol,
          coinName: ctx.input.coinName,
          price: ctx.input.price,
          change: ctx.input.change,
          marketCap: ctx.input.marketCap,
          volume24h: ctx.input.volume24h,
          rank: ctx.input.rank,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
