import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanyOverview = SlateTool.create(spec, {
  name: 'Get Company Overview',
  key: 'get_company_overview',
  description: `Retrieve a comprehensive company overview including description, sector, industry, market capitalization, P/E ratio, EPS, dividend yield, 52-week range, and many more fundamental metrics. Covers US-listed equities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL", "MSFT"')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      name: z.string().describe('Company name'),
      description: z.string().describe('Company description'),
      exchange: z.string().describe('Stock exchange'),
      currency: z.string().describe('Trading currency'),
      country: z.string().describe('Country of incorporation'),
      sector: z.string().describe('Business sector'),
      industry: z.string().describe('Industry classification'),
      marketCapitalization: z.string().describe('Market capitalization'),
      peRatio: z.string().describe('Price-to-earnings ratio'),
      pegRatio: z.string().describe('PEG ratio'),
      bookValue: z.string().describe('Book value per share'),
      dividendPerShare: z.string().describe('Dividend per share'),
      dividendYield: z.string().describe('Dividend yield'),
      eps: z.string().describe('Earnings per share'),
      revenuePerShareTTM: z.string().describe('Revenue per share (trailing 12 months)'),
      profitMargin: z.string().describe('Profit margin'),
      operatingMarginTTM: z.string().describe('Operating margin (TTM)'),
      returnOnAssetsTTM: z.string().describe('Return on assets (TTM)'),
      returnOnEquityTTM: z.string().describe('Return on equity (TTM)'),
      revenueTTM: z.string().describe('Revenue (trailing 12 months)'),
      grossProfitTTM: z.string().describe('Gross profit (TTM)'),
      ebitda: z.string().describe('EBITDA'),
      beta: z.string().describe('Beta coefficient'),
      weekHigh52: z.string().describe('52-week high price'),
      weekLow52: z.string().describe('52-week low price'),
      movingAverage50Day: z.string().describe('50-day moving average'),
      movingAverage200Day: z.string().describe('200-day moving average'),
      sharesOutstanding: z.string().describe('Number of shares outstanding'),
      analystTargetPrice: z.string().describe('Average analyst target price'),
      analystRatingStrongBuy: z.string().describe('Number of strong buy ratings'),
      analystRatingBuy: z.string().describe('Number of buy ratings'),
      analystRatingHold: z.string().describe('Number of hold ratings'),
      analystRatingSell: z.string().describe('Number of sell ratings'),
      analystRatingStrongSell: z.string().describe('Number of strong sell ratings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.companyOverview({ symbol: ctx.input.symbol });

    let output = {
      symbol: data.Symbol || ctx.input.symbol,
      name: data.Name || '',
      description: data.Description || '',
      exchange: data.Exchange || '',
      currency: data.Currency || '',
      country: data.Country || '',
      sector: data.Sector || '',
      industry: data.Industry || '',
      marketCapitalization: data.MarketCapitalization || '',
      peRatio: data.PERatio || '',
      pegRatio: data.PEGRatio || '',
      bookValue: data.BookValue || '',
      dividendPerShare: data.DividendPerShare || '',
      dividendYield: data.DividendYield || '',
      eps: data.EPS || '',
      revenuePerShareTTM: data.RevenuePerShareTTM || '',
      profitMargin: data.ProfitMargin || '',
      operatingMarginTTM: data.OperatingMarginTTM || '',
      returnOnAssetsTTM: data.ReturnOnAssetsTTM || '',
      returnOnEquityTTM: data.ReturnOnEquityTTM || '',
      revenueTTM: data.RevenueTTM || '',
      grossProfitTTM: data.GrossProfitTTM || '',
      ebitda: data.EBITDA || '',
      beta: data.Beta || '',
      weekHigh52: data['52WeekHigh'] || '',
      weekLow52: data['52WeekLow'] || '',
      movingAverage50Day: data['50DayMovingAverage'] || '',
      movingAverage200Day: data['200DayMovingAverage'] || '',
      sharesOutstanding: data.SharesOutstanding || '',
      analystTargetPrice: data.AnalystTargetPrice || '',
      analystRatingStrongBuy: data.AnalystRatingStrongBuy || '',
      analystRatingBuy: data.AnalystRatingBuy || '',
      analystRatingHold: data.AnalystRatingHold || '',
      analystRatingSell: data.AnalystRatingSell || '',
      analystRatingStrongSell: data.AnalystRatingStrongSell || ''
    };

    return {
      output,
      message: `**${output.name}** (${output.symbol}) — ${output.sector} / ${output.industry}. Market cap: $${output.marketCapitalization}. P/E: ${output.peRatio}.`
    };
  })
  .build();
