import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredTicker, responseObject } from '../lib/response';
import { spec } from '../spec';

export let getTickerDetails = SlateTool.create(spec, {
  name: 'Get Ticker Details',
  key: 'get_ticker_details',
  description: `Retrieve detailed information about a ticker symbol including company name, description, market cap, SIC code, homepage URL, and more. Useful for fundamental research and company lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT")'),
      date: z
        .string()
        .optional()
        .describe(
          'Point-in-time date for the ticker details (YYYY-MM-DD). Defaults to most recent.'
        )
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('Ticker symbol'),
      name: z.string().optional().describe('Company name'),
      market: z.string().optional().describe('Market type (stocks, crypto, fx, otc, indices)'),
      locale: z.string().optional().describe('Locale of the asset'),
      primaryExchange: z.string().optional().describe('Primary exchange'),
      type: z.string().optional().describe('Type of ticker (e.g., CS, ETF, ADRC)'),
      active: z.boolean().optional().describe('Whether the ticker is actively traded'),
      currencyName: z.string().optional().describe('Currency name'),
      cik: z.string().optional().describe('Central Index Key (CIK) number for SEC filings'),
      compositeFigi: z.string().optional().describe('Composite FIGI identifier'),
      shareClassFigi: z.string().optional().describe('Share class FIGI identifier'),
      marketCap: z.number().optional().describe('Market capitalization'),
      phoneNumber: z.string().optional().describe('Phone number'),
      description: z.string().optional().describe('Company description'),
      sicCode: z.string().optional().describe('Standard Industrial Classification code'),
      sicDescription: z.string().optional().describe('SIC description'),
      tickerRoot: z.string().optional().describe('Root ticker symbol'),
      homepageUrl: z.string().optional().describe('Company homepage URL'),
      totalEmployees: z.number().optional().describe('Total number of employees'),
      listDate: z.string().optional().describe('Date when ticker was listed'),
      shareClassSharesOutstanding: z
        .number()
        .optional()
        .describe('Outstanding shares for the share class'),
      weightedSharesOutstanding: z.number().optional().describe('Weighted shares outstanding'),
      roundLot: z.number().optional().describe('Round lot size')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getTickerDetails(ctx.input.ticker, {
      date: ctx.input.date
    });

    let r = data.results == null ? undefined : responseObject(data.results, 'ticker details');
    if (!r) return { output: {}, message: `No details returned for **${ctx.input.ticker}**.` };
    requiredTicker(r.ticker);

    return {
      output: {
        ticker: r.ticker ?? undefined,
        name: r.name ?? undefined,
        market: r.market ?? undefined,
        locale: r.locale ?? undefined,
        primaryExchange: r.primary_exchange ?? undefined,
        type: r.type ?? undefined,
        active: r.active ?? undefined,
        currencyName: r.currency_name ?? undefined,
        cik: r.cik ?? undefined,
        compositeFigi: r.composite_figi ?? undefined,
        shareClassFigi: r.share_class_figi ?? undefined,
        marketCap: r.market_cap ?? undefined,
        phoneNumber: r.phone_number ?? undefined,
        description: r.description ?? undefined,
        sicCode: r.sic_code ?? undefined,
        sicDescription: r.sic_description ?? undefined,
        tickerRoot: r.ticker_root ?? undefined,
        homepageUrl: r.homepage_url ?? undefined,
        totalEmployees: r.total_employees ?? undefined,
        listDate: r.list_date ?? undefined,
        shareClassSharesOutstanding: r.share_class_shares_outstanding ?? undefined,
        weightedSharesOutstanding: r.weighted_shares_outstanding ?? undefined,
        roundLot: r.round_lot ?? undefined
      },
      message: `Retrieved details for **${r.name || ctx.input.ticker}** (${r.ticker || ctx.input.ticker}) — ${r.market || 'unknown market'}, ${r.active ? 'active' : 'inactive'}.`
    };
  })
  .build();
