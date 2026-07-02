import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getBulkEod = SlateTool.create(spec, {
  name: 'Get Bulk EOD Data',
  key: 'get_bulk_eod',
  description: `Download end-of-day prices, splits, or dividends in bulk for an entire exchange in a single request. Optionally filter to specific symbols. Use the extended filter for additional fields like company name, EMA 50/200, and average volumes.`,
  instructions: [
    'Exchange code is required (e.g., US, LSE, XETRA)',
    'Use the symbols parameter to filter specific tickers within the exchange'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      exchangeCode: z.string().describe('Exchange code, e.g., US, LSE, XETRA'),
      type: z
        .enum(['eod', 'splits', 'dividends'])
        .optional()
        .describe('Data type to retrieve (default: eod)'),
      date: z
        .string()
        .optional()
        .describe('Specific date in YYYY-MM-DD format (default: last trading day)'),
      symbols: z
        .string()
        .optional()
        .describe('Comma-separated tickers to filter, e.g., "AAPL,MSFT,TSLA" (EOD only)'),
      extended: z
        .boolean()
        .optional()
        .describe('Include extended data (company name, EMA 50/200, avg volumes)')
    })
  )
  .output(
    z.object({
      exchangeCode: z.string().describe('Exchange code'),
      records: z.array(z.any()).describe('Bulk data records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let data = await client.getBulkEod(ctx.input.exchangeCode, {
      type: ctx.input.type,
      date: ctx.input.date,
      symbols: ctx.input.symbols,
      filter: ctx.input.extended ? 'extended' : undefined
    });

    let records = Array.isArray(data) ? data : [];

    return {
      output: {
        exchangeCode: ctx.input.exchangeCode,
        records
      },
      message: `Retrieved **${records.length}** bulk ${ctx.input.type || 'eod'} records for **${ctx.input.exchangeCode}** exchange.`
    };
  })
  .build();
