import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleFinance = SlateTool.create(spec, {
  name: 'Google Finance Search',
  key: 'google_finance_search',
  description: `Extract financial data from Google Finance. Search for stocks, indices, and other financial instruments to get current prices, market data, and related information.`,
  instructions: [
    'Use the stock ticker format like "GOOGL:NASDAQ" or index format like "NIFTY_50:INDEXNSE".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'The stock or financial instrument to search for (e.g., "GOOGL:NASDAQ", "NIFTY_50:INDEXNSE")'
        ),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Finance data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleFinance({
      q: ctx.input.query,
      hl: ctx.input.language
    });

    return {
      output: { results: data },
      message: `Fetched Google Finance data for **"${ctx.input.query}"**.`
    };
  })
  .build();
