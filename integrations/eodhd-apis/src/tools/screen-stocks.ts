import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let screenStocks = SlateTool.create(spec, {
  name: 'Screen Stocks',
  key: 'screen_stocks',
  description: `Screen and filter stocks based on financial criteria such as market cap, sector, earnings, dividend yield, and technical indicators. Supports sorting and pagination.
Filters use JSON array format: \`[["field","operator",value],...]\`. Operators: \`=\`, \`>\`, \`<\`, \`>=\`, \`<=\` for numeric; \`=\`, \`match\` for string fields.`,
  instructions: [
    'Filter format example: [["market_capitalization",">",1000000000],["sector","=","Technology"]]',
    'Sortable by any numeric field: field_name.asc or field_name.desc',
    'Available signals: wallstreet_target_price_50d_h, wallstreet_target_price_200d_h, bookvalue_neg, 200d_new_hi, 200d_new_lo'
  ],
  constraints: [
    'Each request consumes 5 API calls',
    'Max 100 results per request, max offset 999'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .string()
        .optional()
        .describe(
          'JSON array of filter conditions, e.g., [["market_capitalization",">",1000000000]]'
        ),
      signals: z
        .string()
        .optional()
        .describe(
          'Comma-separated signal names, e.g., "200d_new_hi,wallstreet_target_price_50d_h"'
        ),
      sort: z
        .string()
        .optional()
        .describe('Sort field and direction, e.g., "market_capitalization.desc"'),
      limit: z.number().optional().describe('Results per page (1-100, default: 50)'),
      offset: z.number().optional().describe('Pagination offset (default: 0, max: 999)')
    })
  )
  .output(
    z.object({
      stocks: z.array(z.any()).describe('Array of matching stock records with financial data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let result = await client.screenStocks({
      filters: ctx.input.filters,
      signals: ctx.input.signals,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let stocks = Array.isArray(result) ? result : (result?.data ?? []);

    return {
      output: {
        stocks
      },
      message: `Screener returned **${stocks.length}** matching stocks.`
    };
  })
  .build();
