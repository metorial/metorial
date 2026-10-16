import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRecord, responseSeries, responseText } from '../lib/response';
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
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      prices: z
        .array(
          z.object({
            date: z.string().describe('Date of the data point'),
            open: z.string().describe('Opening price'),
            high: z.string().describe('Highest price'),
            low: z.string().describe('Lowest price'),
            close: z.string().describe('Closing price'),
            volume: z.string().describe('Trading volume'),
            marketCap: z.string().describe('Market capitalization in USD')
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

    let metaData = responseRecord(data['Meta Data'], 'metadata');
    let lastRefreshed = responseText(metaData['6. Last Refreshed'], ' Last Refreshed');

    let timeSeries = responseSeries(data);

    let prices = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: responseText(
        values[`1a. open (${market.toUpperCase()})`] ?? values[`1. open`],
        'open in requested market currency'
      ),
      high: responseText(
        values[`2a. high (${market.toUpperCase()})`] ?? values[`2. high`],
        'high in requested market currency'
      ),
      low: responseText(
        values[`3a. low (${market.toUpperCase()})`] ?? values[`3. low`],
        'low in requested market currency'
      ),
      close: responseText(
        values[`4a. close (${market.toUpperCase()})`] ?? values[`4. close`],
        'close in requested market currency'
      ),
      volume: responseText(values['5. volume'], ' volume'),
      marketCap: responseText(values['6. market cap (USD)'], 'market cap (USD)')
    }));

    return {
      output: { symbol, market, lastRefreshed, prices, raw: data },
      message: `Retrieved ${prices.length} ${resolution} price data points for **${symbol}** in ${market}.`
    };
  })
  .build();
