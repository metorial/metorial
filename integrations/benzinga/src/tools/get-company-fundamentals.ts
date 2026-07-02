import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

export let getCompanyFundamentalsTool = SlateTool.create(spec, {
  name: 'Get Company Fundamentals',
  key: 'get_company_fundamentals',
  description: `Retrieve company fundamentals data including company profiles, valuation ratios, financial statements, and earnings reports. Choose a specific data type or get the full fundamentals overview for one or more ticker symbols.`,
  instructions: [
    'Use "overview" to get comprehensive fundamentals data including all sub-categories.',
    'Use specific types like "profile", "valuationRatios", or "financials" for targeted data.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT")'),
      dataType: z
        .enum(['overview', 'profile', 'valuationRatios', 'financials'])
        .optional()
        .default('overview')
        .describe('Type of fundamentals data to retrieve'),
      asOf: z.string().optional().describe('As-of date for historical data (YYYY-MM-DD)'),
      period: z
        .string()
        .optional()
        .describe('Financial period for statements (e.g. "3M", "12M")'),
      reportType: z.string().optional().describe('Report type filter for financial statements')
    })
  )
  .output(
    z.object({
      fundamentals: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of fundamentals data records'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });
    let { symbols, dataType, asOf, period, reportType } = ctx.input;

    let rawData: any;

    switch (dataType) {
      case 'profile':
        rawData = await client.getCompanyProfile({ symbols, asOf });
        break;
      case 'valuationRatios':
        rawData = await client.getValuationRatios({ symbols, asOf });
        break;
      case 'financials':
        rawData = await client.getFinancials({ symbols, asOf, period, reportType });
        break;
      default:
        rawData = await client.getFundamentals({ symbols, asOf });
        break;
    }

    let fundamentals = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];

    return {
      output: {
        fundamentals,
        count: fundamentals.length
      },
      message: `Retrieved ${dataType} fundamentals for **${symbols}** (${fundamentals.length} record(s)).`
    };
  })
  .build();
