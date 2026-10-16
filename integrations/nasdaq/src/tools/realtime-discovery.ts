import { SlateTool } from 'slates';
import { z } from 'zod';
import { parseResponse } from '../lib/http';
import { createRealtimeClient, realtimeRecords } from '../lib/realtime-client';
import { spec } from '../spec';

let records = z.array(z.record(z.string(), z.unknown()));
let symbolSchema = z
  .object({ symbol: z.string().min(1), securityName: z.string() })
  .passthrough();
let indexSchema = z
  .object({ instrument: z.string().min(1), instrumentName: z.string() })
  .passthrough();
let symbolDetailsSchema = symbolSchema.extend({
  listingExchange: z.string().min(1),
  etf: z.boolean(),
  ipoFlag: z.string().optional()
});

export let listSymbols = SlateTool.create(spec, {
  name: 'List Symbols',
  key: 'list_symbols',
  description:
    'List equity symbols supported by the Nasdaq Cloud REST API, with their security names. Requires OAuth2 Client Credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ symbols: z.array(symbolSchema) }))
  .handleInvocation(async ctx => {
    let symbols = parseResponse(
      z.array(symbolSchema),
      await createRealtimeClient(ctx.auth).getSymbols(),
      'symbol directory'
    );
    return { output: { symbols }, message: `Retrieved **${symbols.length}** equity symbols.` };
  })
  .build();

export let getSymbol = SlateTool.create(spec, {
  name: 'Get Symbol',
  key: 'get_symbol',
  description:
    'Get an equity symbol’s security name, listing exchange, and fund/IPO flags. Call list_symbols to discover symbols. Requires OAuth2 Client Credentials.',
  tags: { readOnly: true }
})
  .input(z.object({ symbol: z.string().describe('Equity identifier from list_symbols.') }))
  .output(z.object({ symbol: symbolDetailsSchema }))
  .handleInvocation(async ctx => {
    let symbol = parseResponse(
      symbolDetailsSchema,
      await createRealtimeClient(ctx.auth).getSymbol(ctx.input.symbol),
      'symbol details'
    );
    return { output: { symbol }, message: `Retrieved symbol **${ctx.input.symbol}**.` };
  })
  .build();

export let listIndexes = SlateTool.create(spec, {
  name: 'List Indexes',
  key: 'list_indexes',
  description:
    'List supported index instruments and names for subsequent get_index_data calls. Requires OAuth2 Client Credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ indexes: z.array(indexSchema) }))
  .handleInvocation(async ctx => {
    let indexes = parseResponse(
      z.array(indexSchema),
      await createRealtimeClient(ctx.auth).getIndexes(),
      'index directory'
    );
    return {
      output: { indexes },
      message: `Retrieved **${indexes.length}** index instruments.`
    };
  })
  .build();

export let getIndexData = SlateTool.create(spec, {
  name: 'Get Index Data',
  key: 'get_index_data',
  description:
    'Retrieve current index values or index summary snapshots. Call list_indexes to discover index instrument identifiers. Requires OAuth2 Client Credentials.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      instruments: z
        .array(z.string())
        .describe('Index identifiers from list_indexes, such as NDX.'),
      dataType: z
        .enum(['value', 'snapshot'])
        .optional()
        .describe('Current tick values or summary snapshots. Defaults to value.'),
      offset: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('Real-time or delayed values. Defaults to realtime.')
    })
  )
  .output(z.object({ records }))
  .handleInvocation(async ctx => {
    let result = realtimeRecords(
      await createRealtimeClient(ctx.auth).getIndexData({
        ...ctx.input,
        dataType: ctx.input.dataType ?? 'value'
      }),
      'index data'
    );
    return {
      output: { records: result },
      message: `Retrieved index data for **${ctx.input.instruments.join(', ')}**.`
    };
  })
  .build();

export let getOptionGreeks = SlateTool.create(spec, {
  name: 'Get Option Greeks',
  key: 'get_option_greeks',
  description:
    'Retrieve real-time option Greeks, implied volatility and theoretical price for one contract. Call get_options_chain for the contract identifier. Requires OAuth2 Client Credentials and a Greeks data entitlement.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe(
          'Exact option contract identifier returned by get_options_chain, including internal spaces.'
        )
    })
  )
  .output(z.object({ greeks: records }))
  .handleInvocation(async ctx => {
    let greeks = realtimeRecords(
      await createRealtimeClient(ctx.auth).getOptionGreeks(ctx.input.identifier),
      'option Greeks'
    );
    return {
      output: { greeks },
      message: `Retrieved option Greeks for **${ctx.input.identifier}**.`
    };
  })
  .build();
