import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonCursor,
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields,
  polygonTickerList
} from '../lib/response';
import { spec } from '../spec';

export let getIndicesSnapshot = SlateTool.create(spec, {
  name: 'Get Indices Snapshot',
  key: 'get_indices_snapshot',
  description:
    'Retrieve current index values, trading-session performance, market status, and data timestamps for one or more indices. Per-index errors remain visible in the results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe(
          'Comma-separated index tickers such as I:SPX,I:DJI. Omit to list available snapshots. Use search_tickers with market indices to discover symbols.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Page size; provider default is 10.'),
      order: z.enum(['asc', 'desc']).optional(),
      sort: z.enum(['ticker']).optional(),
      cursor: polygonCursor
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      snapshots: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete index snapshots, including ticker, value, session, timeframe, last_updated, and any error/message.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getIndicesSnapshot({
      ...ctx.input,
      tickers:
        ctx.input.tickers === undefined
          ? undefined
          : polygonTickerList(ctx.input.tickers).join(',')
    });
    let snapshots = polygonRecords(response.results);
    return {
      output: polygonRawOutput({ snapshots }, response),
      message: `Retrieved ${snapshots.length} index snapshot results.`
    };
  })
  .build();
