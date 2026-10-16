import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonCursor,
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields
} from '../lib/response';
import { spec } from '../spec';

export let getReferenceData = SlateTool.create(spec, {
  name: 'Get Reference Data',
  key: 'get_reference_data',
  description:
    'Discover exchange IDs and MICs, ticker type codes, or trade and quote condition codes. Use the returned codes to filter ticker searches and interpret market-data responses.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataType: z.enum(['exchanges', 'ticker_types', 'conditions']),
      assetClass: z.enum(['stocks', 'options', 'fx', 'crypto', 'indices']).optional(),
      locale: z.enum(['us', 'global']).optional().describe('For exchanges and ticker_types.'),
      marketDataType: z
        .enum(['trade', 'bbo', 'nbbo'])
        .optional()
        .describe(
          'For conditions only: trade for trades, bbo for best bid/offer quotes, or nbbo for national best bid/offer quotes.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Page size for conditions only; maximum 1000.'),
      order: z.enum(['asc', 'desc']).optional().describe('For conditions only.'),
      sort: z.string().optional().describe('For conditions only, e.g. id.'),
      cursor: polygonCursor.describe(
        'For conditions only. Cursor returned by a previous call.'
      )
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      records: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Reference records with exchange IDs/names/MICs, ticker codes/descriptions, or condition IDs/names and update rules.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.dataType !== 'conditions' &&
      (ctx.input.marketDataType !== undefined ||
        ctx.input.limit !== undefined ||
        ctx.input.order !== undefined ||
        ctx.input.sort !== undefined ||
        ctx.input.cursor !== undefined)
    ) {
      throw createApiServiceError(
        'marketDataType, limit, order, sort, and cursor apply only to conditions.'
      );
    }
    if (ctx.input.dataType === 'conditions' && ctx.input.locale !== undefined) {
      throw createApiServiceError(
        'locale applies to exchanges or ticker_types, not conditions.'
      );
    }
    let client = new PolygonClient(ctx.auth.token);
    let response =
      ctx.input.dataType === 'exchanges'
        ? await client.getExchanges(ctx.input)
        : ctx.input.dataType === 'ticker_types'
          ? await client.getTickerTypes(ctx.input)
          : await client.getConditions({ ...ctx.input, dataType: ctx.input.marketDataType });
    // The ticker-types documentation also includes a single-object example.
    let results =
      ctx.input.dataType === 'ticker_types' && isApiErrorRecord(response.results)
        ? [response.results]
        : response.results;
    let records = polygonRecords(results);
    return {
      output: polygonRawOutput({ records }, response),
      message: `Retrieved ${records.length} ${ctx.input.dataType} reference records.`
    };
  })
  .build();
