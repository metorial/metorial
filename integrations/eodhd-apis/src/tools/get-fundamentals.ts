import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getFundamentals = SlateTool.create(spec, {
  name: 'Get Fundamentals',
  key: 'get_fundamentals',
  description: `Retrieve comprehensive fundamental data for stocks, ETFs, mutual funds, indices, and cryptocurrencies. Includes financial statements, company profiles, valuation metrics, share data, earnings, and more.
Use the **filter** parameter to retrieve specific sections and reduce response size. Filter uses \`::\` separators for nesting, e.g., \`General::Code\`, \`Financials::Balance_Sheet::yearly\`, or comma-separated for multiple: \`General,Valuation,Earnings\`.`,
  instructions: [
    'Without a filter, the full fundamentals payload is returned which can be very large',
    'Common filters: General, Highlights, Valuation, SharesStats, Technicals, Earnings, Financials'
  ],
  constraints: ['Each request consumes 10 API calls'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z
        .string()
        .describe('Ticker symbol with exchange, e.g., AAPL.US, VTI.US, BTC-USD.CC'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter to retrieve specific data sections, e.g., "General", "Financials::Balance_Sheet::yearly"'
        )
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      fundamentals: z
        .any()
        .describe('Fundamental data object (structure varies by asset type and filter)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let fundamentals = await client.getFundamentals(ctx.input.ticker, {
      filter: ctx.input.filter
    });

    return {
      output: {
        ticker: ctx.input.ticker,
        fundamentals
      },
      message: `Retrieved fundamental data for **${ctx.input.ticker}**${ctx.input.filter ? ` (filter: ${ctx.input.filter})` : ''}.`
    };
  })
  .build();
