import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let earningSchema = z.object({
  code: z.string().describe('Ticker symbol'),
  report_date: z.string().optional().nullable().describe('Earnings report date'),
  date: z.string().optional().nullable().describe('Earnings date'),
  before_after_market: z.string().optional().nullable().describe('Timing relative to market'),
  currency: z.string().optional().nullable().describe('Currency'),
  actual: z.number().optional().nullable().describe('Actual EPS'),
  estimate: z.number().optional().nullable().describe('Estimated EPS'),
  difference: z
    .number()
    .optional()
    .nullable()
    .describe('Difference between actual and estimate'),
  percent: z.number().optional().nullable().describe('Percentage difference')
});

let ipoSchema = z.object({
  code: z.string().describe('Ticker symbol'),
  name: z.string().describe('Company name'),
  exchange: z.string().describe('Exchange'),
  currency: z.string().optional().nullable().describe('Currency'),
  start_date: z.string().optional().nullable().describe('IPO start date'),
  filing_date: z.string().optional().nullable().describe('Filing date'),
  amended_date: z.string().optional().nullable().describe('Amended date'),
  price_from: z.number().optional().nullable().describe('Price range low'),
  price_to: z.number().optional().nullable().describe('Price range high'),
  offer_price: z.number().optional().nullable().describe('Offer price'),
  shares: z.number().optional().nullable().describe('Shares offered'),
  deal_type: z.string().optional().nullable().describe('Deal type')
});

let splitSchema = z.object({
  code: z.string().describe('Ticker symbol'),
  split_date: z.string().describe('Split date'),
  optionable: z.string().optional().nullable().describe('Whether optionable'),
  old_shares: z.string().optional().nullable().describe('Old shares count'),
  new_shares: z.string().optional().nullable().describe('New shares count')
});

export let getFinancialCalendar = SlateTool.create(spec, {
  name: 'Get Financial Calendar',
  key: 'get_financial_calendar',
  description: `Retrieve upcoming financial calendar events including earnings reports, IPOs, and stock splits. Filter by date range and/or specific ticker symbols.`,
  instructions: [
    'Choose one calendar type: earnings, ipos, or splits',
    'For earnings, you can filter by specific symbols using comma-separated tickers'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      calendarType: z
        .enum(['earnings', 'ipos', 'splits'])
        .describe('Type of financial calendar event'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format'),
      symbols: z
        .string()
        .optional()
        .describe('Comma-separated ticker symbols to filter by (earnings and splits only)')
    })
  )
  .output(
    z.object({
      calendarType: z.string().describe('Type of calendar events returned'),
      earnings: z.array(earningSchema).optional().describe('Earnings calendar entries'),
      ipos: z.array(ipoSchema).optional().describe('IPO calendar entries'),
      splits: z.array(splitSchema).optional().describe('Splits calendar entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });
    let calendarType = ctx.input.calendarType;

    if (calendarType === 'earnings') {
      let result = await client.getEarningsCalendar({
        from: ctx.input.from,
        to: ctx.input.to,
        symbols: ctx.input.symbols
      });
      let earnings = result?.earnings ?? (Array.isArray(result) ? result : []);
      return {
        output: { calendarType, earnings },
        message: `Retrieved **${earnings.length}** upcoming earnings events.`
      };
    }

    if (calendarType === 'ipos') {
      let result = await client.getIpoCalendar({
        from: ctx.input.from,
        to: ctx.input.to
      });
      let ipos = result?.ipos ?? (Array.isArray(result) ? result : []);
      return {
        output: { calendarType, ipos },
        message: `Retrieved **${ipos.length}** upcoming IPO events.`
      };
    }

    let result = await client.getSplitsCalendar({
      from: ctx.input.from,
      to: ctx.input.to,
      symbols: ctx.input.symbols
    });
    let splits = result?.splits ?? (Array.isArray(result) ? result : []);
    return {
      output: { calendarType, splits },
      message: `Retrieved **${splits.length}** upcoming stock split events.`
    };
  })
  .build();
