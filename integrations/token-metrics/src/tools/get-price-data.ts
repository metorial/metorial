import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPriceData = SlateTool.create(spec, {
  name: 'Get Price Data',
  key: 'get_price_data',
  description: `Get current token prices or historical OHLCV (Open, High, Low, Close, Volume) candlestick data. Supports both daily and hourly granularity for historical data. Use this to retrieve current prices with 24h changes or historical price charts.`,
  instructions: [
    'For current prices, only tokenId or symbol is needed.',
    'For historical OHLCV, provide a date range. Data is limited to 29-day windows per request.',
    'Historical pricing data starts from 2019-01-01 for most tokens.'
  ],
  constraints: ['Date range for OHLCV data is limited to 29-day windows per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      dataType: z
        .enum(['current', 'daily_ohlcv', 'hourly_ohlcv'])
        .describe('Type of price data to retrieve'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for OHLCV data in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date for OHLCV data in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      priceData: z.array(z.record(z.string(), z.any())).describe('Array of price data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.dataType === 'current') {
      result = await client.getPrice({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol
      });
    } else if (ctx.input.dataType === 'daily_ohlcv') {
      result = await client.getDailyOhlcv({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else {
      result = await client.getHourlyOhlcv({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let priceData = result?.data ?? [];

    return {
      output: { priceData },
      message: `Retrieved **${priceData.length}** ${ctx.input.dataType} price record(s).`
    };
  })
  .build();
