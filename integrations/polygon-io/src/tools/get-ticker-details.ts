import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTickerDetails = SlateTool.create(spec, {
  name: 'Get Ticker Details',
  key: 'get_ticker_details',
  description: `Retrieve detailed information about a ticker symbol including company name, description, market cap, SIC code, homepage URL, address, and more. Useful for fundamental research and company lookups.`,
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
      ticker: z.string().describe('Ticker symbol'),
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

    let r = data.results || {};

    return {
      output: {
        ticker: r.ticker || ctx.input.ticker,
        name: r.name,
        market: r.market,
        locale: r.locale,
        primaryExchange: r.primary_exchange,
        type: r.type,
        active: r.active,
        currencyName: r.currency_name,
        cik: r.cik,
        compositeFigi: r.composite_figi,
        shareClassFigi: r.share_class_figi,
        marketCap: r.market_cap,
        phoneNumber: r.phone_number,
        description: r.description,
        sicCode: r.sic_code,
        sicDescription: r.sic_description,
        tickerRoot: r.ticker_root,
        homepageUrl: r.homepage_url,
        totalEmployees: r.total_employees,
        listDate: r.list_date,
        shareClassSharesOutstanding: r.share_class_shares_outstanding,
        weightedSharesOutstanding: r.weighted_shares_outstanding,
        roundLot: r.round_lot
      },
      message: `Retrieved details for **${r.name || ctx.input.ticker}** (${r.ticker || ctx.input.ticker}) — ${r.market || 'unknown market'}, ${r.active ? 'active' : 'inactive'}.`
    };
  })
  .build();
