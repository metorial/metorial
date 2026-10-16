import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, record, rows } from '../lib/client';
import { spec } from '../spec';

let pageInput = z.object({
  limit: z.number().optional().describe('Results per page, from 1 to 1000.'),
  offset: z.number().optional().describe('Non-negative pagination offset.')
});
let pageOutput = z.object({
  pagination: z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    count: z.number().optional(),
    total: z.number().optional()
  }),
  data: z.array(z.record(z.string(), z.unknown())),
  raw: z.unknown().optional()
});

export let listCurrencies = SlateTool.create(spec, {
  key: 'list_currencies',
  name: 'List Currencies',
  description:
    'List supported currencies, including currency codes, names, and native symbols.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(pageOutput)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getCurrencies(ctx.input);
    return { output: result, message: `Retrieved ${result.data.length} currencies.` };
  })
  .build();

export let listTimezones = SlateTool.create(spec, {
  key: 'list_timezones',
  name: 'List Timezones',
  description:
    'List supported IANA timezones and their standard and daylight-saving abbreviations.',
  tags: { readOnly: true }
})
  .input(pageInput)
  .output(pageOutput)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getTimezones(ctx.input);
    return { output: result, message: `Retrieved ${result.data.length} timezones.` };
  })
  .build();

export let listEtfs = SlateTool.create(spec, {
  key: 'list_etfs',
  name: 'List ETFs',
  description: 'Discover available ETF ticker symbols before retrieving their holdings.',
  constraints: ['ETF requests count as 20 API calls toward the provider quota.'],
  tags: { readOnly: true }
})
  .input(
    pageInput.extend({
      ticker: z.string().optional().describe('Filter by ETF ticker.'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      status: z
        .string()
        .optional()
        .describe('Filter by ETF status as accepted by the provider.')
    })
  )
  .output(pageOutput)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getEtfs(ctx.input);
    return { output: result, message: `Retrieved ${result.data.length} ETFs.` };
  })
  .build();

export let getCompanyProfile = SlateTool.create(spec, {
  key: 'get_company_profile',
  name: 'Get Company Profile',
  description:
    'Get extended company information by ticker, including industry, sector, executives, addresses, and listings when provided.',
  tags: { readOnly: true }
})
  .input(z.object({ symbol: z.string().describe('Company ticker symbol, for example AAPL.') }))
  .output(
    z.object({ profile: z.record(z.string(), z.unknown()), raw: z.unknown().optional() })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client(ctx.auth).getCompanyProfile(ctx.input.symbol);
    return {
      output: { profile: record(record(raw).data), raw },
      message: `Retrieved the company profile for ${ctx.input.symbol}.`
    };
  })
  .build();

export let getRealtimePrices = SlateTool.create(spec, {
  key: 'get_realtime_prices',
  name: 'Get Real-Time Stock Prices',
  description:
    'Get the last known stock price across exchanges, with currency and the provider trade timestamp.',
  constraints: ['Available on Professional plans and higher.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, for example AAPL.'),
      exchange: z
        .string()
        .optional()
        .describe('Exchange MIC to filter by; discover codes with list_exchanges.')
    })
  )
  .output(
    z.object({
      prices: z.array(z.record(z.string(), z.unknown())),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client(ctx.auth).getRealTimePrice(ctx.input);
    let prices = rows(record(raw).data);
    return {
      output: { prices, raw },
      message: `Retrieved ${prices.length} real-time price records for ${ctx.input.symbol}.`
    };
  })
  .build();

export let getMarketIndex = SlateTool.create(spec, {
  key: 'get_market_index',
  name: 'Get Market Index',
  description:
    'Retrieve a single benchmark quote directly without listing and fetching every index. Use get_market_indices to discover benchmark names.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      index: z.string().describe('Exact benchmark identifier accepted by the provider.')
    })
  )
  .output(
    z.object({
      indices: z.array(z.record(z.string(), z.unknown())),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client(ctx.auth).getMarketIndex(ctx.input.index);
    return {
      output: { indices: rows(Array.isArray(raw) ? raw : record(raw).data), raw },
      message: `Retrieved market index ${ctx.input.index}.`
    };
  })
  .build();
