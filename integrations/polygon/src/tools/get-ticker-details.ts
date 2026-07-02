import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getTickerDetails = SlateTool.create(spec, {
  name: 'Get Ticker Details',
  key: 'get_ticker_details',
  description: `Retrieve comprehensive details about a ticker including company information, market cap, industry classification, branding, address, employee count, and other fundamental data. Supports point-in-time lookups by specifying a date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., AAPL, MSFT)'),
      date: z
        .string()
        .optional()
        .describe(
          'Point-in-time date (YYYY-MM-DD) to retrieve historical ticker details. Defaults to most recent.'
        )
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('Ticker symbol'),
      name: z.string().optional().describe('Company or asset name'),
      market: z.string().optional().describe('Market type (e.g., stocks, crypto, fx)'),
      locale: z.string().optional().describe('Locale (e.g., us)'),
      active: z.boolean().optional().describe('Whether actively traded'),
      currencyName: z.string().optional().describe('Trading currency'),
      primaryExchange: z.string().optional().describe('Primary listing exchange ISO code'),
      type: z.string().optional().describe('Asset type'),
      marketCap: z.number().optional().describe('Market capitalization'),
      description: z.string().optional().describe('Company description'),
      homepageUrl: z.string().optional().describe('Company homepage URL'),
      totalEmployees: z.number().optional().describe('Total number of employees'),
      listDate: z.string().optional().describe('IPO / listing date'),
      phoneNumber: z.string().optional().describe('Company phone number'),
      sicCode: z.string().optional().describe('SIC industry code'),
      sicDescription: z.string().optional().describe('SIC industry description'),
      cik: z.string().optional().describe('SEC CIK number'),
      compositeFigi: z.string().optional().describe('Composite OpenFIGI identifier'),
      shareClassFigi: z.string().optional().describe('Share class OpenFIGI identifier'),
      shareClassSharesOutstanding: z
        .number()
        .optional()
        .describe('Outstanding shares for this share class'),
      weightedSharesOutstanding: z.number().optional().describe('Weighted shares outstanding'),
      roundLot: z.number().optional().describe('Round lot size'),
      tickerRoot: z.string().optional().describe('Ticker root (e.g., BRK for BRK.A)'),
      address: z
        .object({
          address1: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional()
        })
        .optional()
        .describe('Company headquarters address'),
      brandingIconUrl: z.string().optional().describe('Company icon URL'),
      brandingLogoUrl: z.string().optional().describe('Company logo URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getTickerDetails({
      ticker: ctx.input.ticker,
      date: ctx.input.date
    });

    let r = response.results;
    if (!r) {
      return {
        output: { ticker: ctx.input.ticker } as any,
        message: `No details found for **${ctx.input.ticker}**.`
      };
    }

    return {
      output: {
        ticker: r.ticker,
        name: r.name,
        market: r.market,
        locale: r.locale,
        active: r.active,
        currencyName: r.currency_name,
        primaryExchange: r.primary_exchange,
        type: r.type,
        marketCap: r.market_cap,
        description: r.description,
        homepageUrl: r.homepage_url,
        totalEmployees: r.total_employees,
        listDate: r.list_date,
        phoneNumber: r.phone_number,
        sicCode: r.sic_code,
        sicDescription: r.sic_description,
        cik: r.cik,
        compositeFigi: r.composite_figi,
        shareClassFigi: r.share_class_figi,
        shareClassSharesOutstanding: r.share_class_shares_outstanding,
        weightedSharesOutstanding: r.weighted_shares_outstanding,
        roundLot: r.round_lot,
        tickerRoot: r.ticker_root,
        address: r.address
          ? {
              address1: r.address.address1,
              city: r.address.city,
              state: r.address.state,
              postalCode: r.address.postal_code
            }
          : undefined,
        brandingIconUrl: r.branding?.icon_url,
        brandingLogoUrl: r.branding?.logo_url
      },
      message: `**${r.name}** (${r.ticker}) — ${r.market} market${r.market_cap ? `, Market Cap: $${(r.market_cap / 1e9).toFixed(2)}B` : ''}.`
    };
  })
  .build();
