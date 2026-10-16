import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageRecord,
  finageRecords,
  finageString,
  validateFinageLimit
} from '../lib/response';
import { spec } from '../spec';

export let searchMarket = SlateTool.create(spec, {
  name: 'Search Market Symbols',
  key: 'search_market',
  description: `Search for US stock symbols by company name or description. Use list_symbols for other supported market catalogs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search keyword (company name, ticker, or description)'),
      market: z
        .enum(['us', 'uk', 'de', 'ca', 'jp', 'hk', 'in', 'au', 'fr', 'kr'])
        .default('us')
        .describe(
          'Market to search in. The provider currently documents us only; other saved values remain accepted by the schema.'
        ),
      limit: z.number().default(10).describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      results: z
        .array(
          z.object({
            symbol: z.string().optional().describe('Ticker symbol'),
            description: z.string().optional().describe('Company name or description'),
            exchangeType: z.string().optional().describe('Exchange type')
          })
        )
        .describe('Matching symbols')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { query, market, limit } = ctx.input;
    if (!query.trim()) throw createApiServiceError('Provide a non-empty search keyword.');
    validateFinageLimit(limit, 'Limit');
    if (market !== 'us')
      throw createApiServiceError(
        'Finage market search currently documents US stocks only. Choose us, or use list_symbols for other supported markets.'
      );
    let data = await client.searchMarket(market, query.trim(), limit);
    let rawResults = Array.isArray(data)
      ? data.flatMap(item => {
          let record = finageRecord(item);
          return Array.isArray(record.results) ? finageRecords(record.results) : [record];
        })
      : finageRecords(data, ['results']);
    let results = rawResults.map(r =>
      pickDefined({
        symbol: finageString(r.symbol),
        description: finageString(r.description ?? r.name),
        exchangeType: finageString(r.s_type ?? r.exchange)
      })
    );
    return {
      output: { results, raw: data },
      message: `Found **${results.length}** results for "${query}" in the ${market.toUpperCase()} market.`
    };
  })
  .build();
