import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonCursor,
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields
} from '../lib/response';
import { spec } from '../spec';

export let getFinancialRatios = SlateTool.create(spec, {
  name: 'Get Financial Ratios',
  key: 'get_financial_ratios',
  description:
    'Retrieve the latest valuation, profitability, liquidity, and leverage ratios for companies. This endpoint provides the latest daily snapshot rather than historical ratio series.',
  constraints: ['Requires a subscription or add-on with financial ratios access.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ticker: z
        .string()
        .optional()
        .describe('Stock ticker. Use search_tickers to discover symbols.'),
      cik: z
        .string()
        .optional()
        .describe('SEC company CIK, available from get_ticker_details.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50000)
        .optional()
        .describe('Page size; provider default is 100.'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort columns with .asc or .desc, e.g. ticker.asc. Date is not a supported sort column.'
        ),
      cursor: polygonCursor
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      ratios: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete daily financial ratio records, including company ticker, calculation date, and available valuation and performance metrics.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getFinancialRatios(ctx.input);
    let ratios = polygonRecords(response.results, 'results', true);
    return {
      output: polygonRawOutput({ ratios }, response),
      message: `Retrieved ${ratios.length} financial ratio records.`
    };
  })
  .build();
