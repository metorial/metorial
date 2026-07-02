import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let optionActivitySchema = z.object({
  signalId: z.string().optional().describe('Unique signal identifier'),
  ticker: z.string().optional().describe('Underlying ticker symbol'),
  date: z.string().optional().describe('Signal date'),
  time: z.string().optional().describe('Signal time'),
  optionSymbol: z.string().optional().describe('Option contract symbol'),
  putCall: z.string().optional().describe('Put or Call'),
  strikePrice: z.number().optional().describe('Strike price'),
  expirationDate: z.string().optional().describe('Option expiration date'),
  sentiment: z.string().optional().describe('Bullish/Bearish/Neutral sentiment'),
  activityType: z.string().optional().describe('Type of unusual activity (e.g. Sweep, Trade)'),
  description: z.string().optional().describe('Activity description'),
  size: z.number().optional().describe('Contract size'),
  volume: z.number().optional().describe('Trading volume'),
  openInterest: z.number().optional().describe('Open interest'),
  costBasis: z.string().optional().describe('Total cost basis'),
  underlyingPrice: z.number().optional().describe('Underlying stock price'),
  updated: z.number().optional().describe('Last updated timestamp')
});

export let getOptionsActivityTool = SlateTool.create(spec, {
  name: 'Get Options Activity',
  key: 'get_options_activity',
  description: `Retrieve unusual options activity signals. Includes option type, strike price, expiration, volume, sentiment, and more. Useful for identifying potential market-moving trades.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe('Comma-separated ticker symbols to filter (max 50)'),
      date: z.string().optional().describe('Specific date (YYYY-MM-DD)'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 1000)')
    })
  )
  .output(
    z.object({
      signals: z.array(optionActivitySchema).describe('Unusual options activity signals'),
      count: z.number().describe('Number of signals returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getOptionActivity({
      tickers: ctx.input.tickers,
      date: ctx.input.date,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = Array.isArray(data) ? data : [];
    let signals = items.map((item: any) => ({
      signalId: item.id,
      ticker: item.ticker,
      date: item.date,
      time: item.time,
      optionSymbol: item.option_symbol,
      putCall: item.put_call,
      strikePrice: item.strike_price ? Number(item.strike_price) : undefined,
      expirationDate: item.date_expiration,
      sentiment: item.sentiment,
      activityType: item.option_activity_type,
      description: item.description,
      size: item.size ? Number(item.size) : undefined,
      volume: item.volume ? Number(item.volume) : undefined,
      openInterest: item.open_interest ? Number(item.open_interest) : undefined,
      costBasis: item.cost_basis,
      underlyingPrice: item.underlying_price ? Number(item.underlying_price) : undefined,
      updated: item.updated
    }));

    return {
      output: {
        signals,
        count: signals.length
      },
      message: `Found **${signals.length}** unusual options activity signal(s)${ctx.input.tickers ? ` for: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
