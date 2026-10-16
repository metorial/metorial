import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorInput, cursorOutput, nextCursor, responseRows } from '../lib/response';
import { spec } from '../spec';

let optionContractSchema = z.object({
  ticker: z
    .string()
    .optional()
    .describe('Options contract ticker (e.g., O:AAPL230616C00150000)'),
  underlyingTicker: z.string().optional().describe('Underlying asset ticker'),
  contractType: z.string().optional().describe('Contract type (call or put)'),
  expirationDate: z.string().optional().describe('Expiration date'),
  strikePrice: z.number().optional().describe('Strike price'),
  exerciseStyle: z.string().optional().describe('Exercise style (american or european)'),
  sharesPerContract: z.number().optional().describe('Shares per contract (usually 100)'),
  cfi: z.string().optional().describe('CFI code'),
  primaryExchange: z.string().optional().describe('Primary exchange'),
  additionalUnderlyings: z.array(z.any()).optional().describe('Additional underlyings')
});

let optionSnapshotSchema = z.object({
  ticker: z.string().optional().describe('Options contract ticker'),
  contractType: z.string().optional().describe('Contract type'),
  expirationDate: z.string().optional().describe('Expiration date'),
  strikePrice: z.number().optional().describe('Strike price'),
  impliedVolatility: z.number().optional().describe('Implied volatility'),
  openInterest: z.number().optional().describe('Open interest'),
  day: z
    .object({
      open: z.number().optional(),
      high: z.number().optional(),
      low: z.number().optional(),
      close: z.number().optional(),
      volume: z.number().optional(),
      volumeWeighted: z.number().optional(),
      lastUpdated: z.number().optional()
    })
    .optional()
    .describe('Current day OHLCV data'),
  lastQuote: z
    .object({
      bidPrice: z.number().optional(),
      bidSize: z.number().optional(),
      askPrice: z.number().optional(),
      askSize: z.number().optional(),
      midpoint: z.number().optional(),
      timestamp: z.number().optional()
    })
    .optional()
    .describe('Last quote data'),
  greeks: z
    .object({
      delta: z.number().optional(),
      gamma: z.number().optional(),
      theta: z.number().optional(),
      vega: z.number().optional()
    })
    .optional()
    .describe('Option Greeks'),
  underlyingAssetPrice: z
    .number()
    .optional()
    .describe('Current price of the underlying asset'),
  breakEvenPrice: z.number().optional().describe('Break-even price')
});

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve options chain data for an underlying stock. Fetches available option contracts or their snapshots including Greeks, implied volatility, open interest, and quotes. Filter by contract type, expiration date, and strike price. Snapshot access and freshness depend on the subscription.`,
  instructions: [
    'Set includeSnapshots to true to get snapshot pricing and Greeks, subject to the subscription.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: cursorInput,
      underlyingTicker: z.string().describe('Underlying stock ticker (e.g., "AAPL")'),
      contractType: z.enum(['call', 'put']).optional().describe('Filter by call or put'),
      expirationDate: z.string().optional().describe('Exact expiration date (YYYY-MM-DD)'),
      expirationDateFrom: z
        .string()
        .optional()
        .describe('Expiration date on or after (YYYY-MM-DD)'),
      expirationDateTo: z
        .string()
        .optional()
        .describe('Expiration date on or before (YYYY-MM-DD)'),
      strikePriceFrom: z.number().optional().describe('Strike price greater than or equal to'),
      strikePriceTo: z.number().optional().describe('Strike price less than or equal to'),
      includeSnapshots: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Return snapshots instead of contract reference records, with available Greeks and quotes'
        ),
      order: z.enum(['asc', 'desc']).optional().default('asc').describe('Sort order'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of contracts to return')
    })
  )
  .output(
    z.object({
      nextCursor: cursorOutput,
      contracts: z
        .array(optionContractSchema)
        .optional()
        .describe('Option contract reference data'),
      snapshots: z
        .array(optionSnapshotSchema)
        .optional()
        .describe('Option contract snapshots with available pricing data'),
      count: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.includeSnapshots) {
      let data = await client.getOptionsChainSnapshot(ctx.input.underlyingTicker, {
        contractType: ctx.input.contractType,
        expirationDate: ctx.input.expirationDate,
        expirationDateGte: ctx.input.expirationDateFrom,
        expirationDateLte: ctx.input.expirationDateTo,
        strikePriceGte: ctx.input.strikePriceFrom,
        strikePriceLte: ctx.input.strikePriceTo,
        order: ctx.input.order,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      });

      let snapshots = responseRows(data.results)?.map((s: any) => ({
        ticker: s.details?.ticker ?? undefined,
        contractType: s.details?.contract_type ?? undefined,
        expirationDate: s.details?.expiration_date ?? undefined,
        strikePrice: s.details?.strike_price ?? undefined,
        impliedVolatility: s.implied_volatility ?? undefined,
        openInterest: s.open_interest ?? undefined,
        day: s.day
          ? {
              open: s.day.open ?? undefined,
              high: s.day.high ?? undefined,
              low: s.day.low ?? undefined,
              close: s.day.close ?? undefined,
              volume: s.day.volume ?? undefined,
              volumeWeighted: s.day.vwap ?? undefined,
              lastUpdated: s.day.last_updated ?? undefined
            }
          : undefined,
        lastQuote: s.last_quote
          ? {
              bidPrice: s.last_quote.bid ?? undefined,
              bidSize: s.last_quote.bid_size ?? undefined,
              askPrice: s.last_quote.ask ?? undefined,
              askSize: s.last_quote.ask_size ?? undefined,
              midpoint: s.last_quote.midpoint ?? undefined,
              timestamp: s.last_quote.last_updated ?? undefined
            }
          : undefined,
        greeks: s.greeks
          ? {
              delta: s.greeks.delta ?? undefined,
              gamma: s.greeks.gamma ?? undefined,
              theta: s.greeks.theta ?? undefined,
              vega: s.greeks.vega ?? undefined
            }
          : undefined,
        underlyingAssetPrice: s.underlying_asset?.price ?? undefined,
        breakEvenPrice: s.break_even_price ?? undefined
      }));

      return {
        output: {
          nextCursor: nextCursor(data),
          snapshots,
          count: snapshots?.length ?? undefined
        },
        message: `Retrieved **${snapshots?.length ?? 0}** options snapshot(s) for **${ctx.input.underlyingTicker}**${ctx.input.contractType ? ` (${ctx.input.contractType}s)` : ''}.`
      };
    }

    let data = await client.getOptionsContracts({
      underlyingTicker: ctx.input.underlyingTicker,
      contractType: ctx.input.contractType,
      expirationDate: ctx.input.expirationDate,
      expirationDateGte: ctx.input.expirationDateFrom,
      expirationDateLte: ctx.input.expirationDateTo,
      strikePriceGte: ctx.input.strikePriceFrom,
      strikePriceLte: ctx.input.strikePriceTo,
      order: ctx.input.order,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let contracts = responseRows(data.results)?.map((c: any) => ({
      ticker: c.ticker ?? undefined,
      underlyingTicker: c.underlying_ticker ?? undefined,
      contractType: c.contract_type ?? undefined,
      expirationDate: c.expiration_date ?? undefined,
      strikePrice: c.strike_price ?? undefined,
      exerciseStyle: c.exercise_style ?? undefined,
      sharesPerContract: c.shares_per_contract ?? undefined,
      cfi: c.cfi ?? undefined,
      primaryExchange: c.primary_exchange ?? undefined,
      additionalUnderlyings: c.additional_underlyings ?? undefined
    }));

    return {
      output: {
        nextCursor: nextCursor(data),
        contracts,
        count: contracts?.length ?? undefined
      },
      message: `Retrieved **${contracts?.length ?? 0}** options contract(s) for **${ctx.input.underlyingTicker}**${ctx.input.contractType ? ` (${ctx.input.contractType}s)` : ''}.`
    };
  })
  .build();
