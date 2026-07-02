import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCryptoPrice = SlateTool.create(spec, {
  name: 'Get Crypto Price',
  key: 'get_crypto_price',
  description: `Retrieve historical price data for a cryptocurrency. Returns daily, weekly, or monthly OHLCV data priced in a chosen market currency. Use standard crypto symbols (e.g. BTC, ETH, DOGE) and market currencies (e.g. USD, EUR).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Cryptocurrency symbol, e.g. "BTC", "ETH", "DOGE"'),
      market: z
        .string()
        .optional()
        .default('USD')
        .describe('Market/pricing currency, e.g. "USD", "EUR"'),
      resolution: z
        .enum(['daily', 'weekly', 'monthly'])
        .optional()
        .default('daily')
        .describe('Time resolution for the data')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Cryptocurrency symbol'),
      market: z.string().describe('Market currency'),
      lastRefreshed: z.string().describe('Timestamp of the latest data point'),
      prices: z
        .array(
          z.object({
            date: z.string().describe('Date of the data point'),
            open: z.string().describe('Opening price'),
            high: z.string().describe('Highest price'),
            low: z.string().describe('Lowest price'),
            close: z.string().describe('Closing price'),
            volume: z.string().describe('Trading volume'),
            marketCap: z.string().describe('Market capitalization')
          })
        )
        .describe('Price data points, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, market, resolution } = ctx.input;

    let data: any;
    if (resolution === 'daily') {
      data = await client.cryptoDaily({ symbol, market });
    } else if (resolution === 'weekly') {
      data = await client.cryptoWeekly({ symbol, market });
    } else {
      data = await client.cryptoMonthly({ symbol, market });
    }

    let metaData = data['Meta Data'] || {};
    let lastRefreshed = metaData['6. Last Refreshed'] || '';

    let timeSeriesKey = Object.keys(data).find(k => k !== 'Meta Data') || '';
    let timeSeries = data[timeSeriesKey] || {};

    let prices = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: values['1a. open (USD)'] || values['1. open'] || '',
      high: values['2a. high (USD)'] || values['2. high'] || '',
      low: values['3a. low (USD)'] || values['3. low'] || '',
      close: values['4a. close (USD)'] || values['4. close'] || '',
      volume: values['5. volume'] || '',
      marketCap: values['6. market cap (USD)'] || ''
    }));

    return {
      output: { symbol, market, lastRefreshed, prices },
      message: `Retrieved ${prices.length} ${resolution} price data points for **${symbol}** in ${market}.`
    };
  })
  .build();
