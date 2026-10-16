import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields,
  polygonTickerList
} from '../lib/response';
import { spec } from '../spec';

export let getForexSnapshots = SlateTool.create(spec, {
  name: 'Get Forex Snapshots',
  key: 'get_forex_snapshots',
  description:
    'Retrieve current forex market snapshots for selected currency pairs or the whole forex market, including daily bars, prior-day bars, last quotes, and price changes.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe(
          'Comma-separated forex symbols with C: prefixes, e.g. C:EURUSD,C:GBPUSD. Omit for all forex pairs. Use search_tickers with market fx to discover pairs.'
        )
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      snapshots: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete forex snapshots with ticker symbols, day/prevDay/min bars, last quotes, and daily changes.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getAllForexSnapshots({
      tickers:
        ctx.input.tickers === undefined
          ? undefined
          : polygonTickerList(ctx.input.tickers).join(',')
    });
    let snapshots = polygonRecords(response.tickers, 'tickers');
    return {
      output: polygonRawOutput({ snapshots }, response),
      message: `Retrieved ${snapshots.length} forex snapshots.`
    };
  })
  .build();
