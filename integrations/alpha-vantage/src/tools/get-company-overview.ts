import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseText } from '../lib/response';
import { spec } from '../spec';

export let getCompanyOverview = SlateTool.create(spec, {
  name: 'Get Company Overview',
  key: 'get_company_overview',
  description: `Retrieve a comprehensive company overview including description, sector, industry, market capitalization, P/E ratio, EPS, dividend yield, 52-week range, and many more fundamental metrics. Covers US-listed equities.`,
  constraints: ['Company overview data requires a premium API key.'],
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
      symbol: responseText(data.Symbol, 'symbol'),
      name: responseText(data.Name, 'Name'),
      description: responseText(data.Description, 'Description'),
      exchange: responseText(data.Exchange, 'Exchange'),
      currency: responseText(data.Currency, 'Currency'),
      country: responseText(data.Country, 'Country'),
      sector: responseText(data.Sector, 'Sector'),
      industry: responseText(data.Industry, 'Industry'),
      marketCapitalization: responseText(data.MarketCapitalization, 'MarketCapitalization'),
      peRatio: responseText(data.PERatio, 'PERatio'),
      pegRatio: responseText(data.PEGRatio, 'PEGRatio'),
      bookValue: responseText(data.BookValue, 'BookValue'),
      dividendPerShare: responseText(data.DividendPerShare, 'DividendPerShare'),
      dividendYield: responseText(data.DividendYield, 'DividendYield'),
      eps: responseText(data.EPS, 'EPS'),
      revenuePerShareTTM: responseText(data.RevenuePerShareTTM, 'RevenuePerShareTTM'),
      profitMargin: responseText(data.ProfitMargin, 'ProfitMargin'),
      operatingMarginTTM: responseText(data.OperatingMarginTTM, 'OperatingMarginTTM'),
      returnOnAssetsTTM: responseText(data.ReturnOnAssetsTTM, 'ReturnOnAssetsTTM'),
      returnOnEquityTTM: responseText(data.ReturnOnEquityTTM, 'ReturnOnEquityTTM'),
      revenueTTM: responseText(data.RevenueTTM, 'RevenueTTM'),
      grossProfitTTM: responseText(data.GrossProfitTTM, 'GrossProfitTTM'),
      ebitda: responseText(data.EBITDA, 'EBITDA'),
      beta: responseText(data.Beta, 'Beta'),
      weekHigh52: responseText(data['52WeekHigh'], 'data52WeekHigh'),
      weekLow52: responseText(data['52WeekLow'], 'data52WeekLow'),
      movingAverage50Day: responseText(data['50DayMovingAverage'], 'data50DayMovingAverage'),
      movingAverage200Day: responseText(
        data['200DayMovingAverage'],
        'data200DayMovingAverage'
      ),
      sharesOutstanding: responseText(data.SharesOutstanding, 'SharesOutstanding'),
      analystTargetPrice: responseText(data.AnalystTargetPrice, 'AnalystTargetPrice'),
      analystRatingStrongBuy: responseText(
        data.AnalystRatingStrongBuy,
        'AnalystRatingStrongBuy'
      ),
      analystRatingBuy: responseText(data.AnalystRatingBuy, 'AnalystRatingBuy'),
      analystRatingHold: responseText(data.AnalystRatingHold, 'AnalystRatingHold'),
      analystRatingSell: responseText(data.AnalystRatingSell, 'AnalystRatingSell'),
      analystRatingStrongSell: responseText(
        data.AnalystRatingStrongSell,
        'AnalystRatingStrongSell'
      )
    };

    return {
      output,
      message: `**${output.name}** (${output.symbol}) — ${output.sector} / ${output.industry}. Market cap: $${output.marketCapitalization}. P/E: ${output.peRatio}.`
    };
  })
  .build();
