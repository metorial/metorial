import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve end-of-day options chain data with Greeks for US stocks. Includes strike prices, expiration dates, implied volatility, bid/ask prices, open interest, and volume.
Filter by expiration date range or specific contract name.`,
  instructions: [
    'Use from/to to filter by expiration dates',
    'Use tradeDateFrom/tradeDateTo to filter by trade dates'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('US stock ticker, e.g., AAPL.US'),
      from: z.string().optional().describe('Expiration date range start (YYYY-MM-DD)'),
      to: z.string().optional().describe('Expiration date range end (YYYY-MM-DD)'),
      tradeDateFrom: z.string().optional().describe('Trade date range start (YYYY-MM-DD)'),
      tradeDateTo: z.string().optional().describe('Trade date range end (YYYY-MM-DD)'),
      contractName: z.string().optional().describe('Specific options contract name')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      options: z
        .any()
        .describe('Options chain data with calls/puts, strikes, Greeks, and more')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let options = await client.getOptionsChain(ctx.input.ticker, {
      from: ctx.input.from,
      to: ctx.input.to,
      tradeDateFrom: ctx.input.tradeDateFrom,
      tradeDateTo: ctx.input.tradeDateTo,
      contractName: ctx.input.contractName
    });

    return {
      output: {
        ticker: ctx.input.ticker,
        options
      },
      message: `Retrieved options chain data for **${ctx.input.ticker}**.`
    };
  })
  .build();
