import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve options contracts and chain snapshots for a given underlying ticker. Supports filtering by contract type (call/put), strike price range, and expiration date range. Snapshots include Greeks, implied volatility, break-even price, and underlying asset data.`,
  instructions: [
    'Use the underlying stock ticker (e.g., AAPL), not the options contract symbol.',
    'Use YYYY-MM-DD format for expiration dates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      underlyingTicker: z.string().describe('Underlying stock ticker symbol (e.g., AAPL)'),
      contractType: z
        .enum(['call', 'put'])
        .optional()
        .describe('Filter by call or put contracts'),
      expirationDate: z.string().optional().describe('Exact expiration date (YYYY-MM-DD)'),
      expirationDateFrom: z
        .string()
        .optional()
        .describe('Minimum expiration date (YYYY-MM-DD)'),
      expirationDateTo: z.string().optional().describe('Maximum expiration date (YYYY-MM-DD)'),
      strikePriceFrom: z.number().optional().describe('Minimum strike price'),
      strikePriceTo: z.number().optional().describe('Maximum strike price'),
      includeSnapshots: z
        .boolean()
        .optional()
        .describe(
          'Whether to include live snapshot data with Greeks and IV. Defaults to false (returns contracts only).'
        ),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Max number of results to return (default 10, max 1000)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      contracts: z
        .array(
          z.object({
            contractTicker: z.string().optional().describe('Options contract ticker symbol'),
            underlyingTicker: z.string().optional().describe('Underlying stock ticker'),
            contractType: z.string().optional().describe('Call or put'),
            strikePrice: z.number().optional().describe('Strike price'),
            expirationDate: z.string().optional().describe('Expiration date'),
            exerciseStyle: z.string().optional().describe('American, European, or Bermudan'),
            sharesPerContract: z.number().optional().describe('Number of shares per contract'),
            primaryExchange: z
              .string()
              .optional()
              .describe('Primary listing exchange MIC code'),
            // Snapshot fields (only present when includeSnapshots is true)
            impliedVolatility: z.number().optional().describe('Implied volatility'),
            openInterest: z.number().optional().describe('Open interest'),
            breakEvenPrice: z.number().optional().describe('Break-even price'),
            greeks: z
              .object({
                delta: z.number().optional(),
                gamma: z.number().optional(),
                theta: z.number().optional(),
                vega: z.number().optional()
              })
              .optional()
              .describe('Option Greeks'),
            lastQuote: z
              .object({
                bidPrice: z.number().optional(),
                bidSize: z.number().optional(),
                askPrice: z.number().optional(),
                askSize: z.number().optional(),
                midpoint: z.number().optional()
              })
              .optional()
              .describe('Last quote for the contract'),
            day: z
              .object({
                open: z.number().optional(),
                high: z.number().optional(),
                low: z.number().optional(),
                close: z.number().optional(),
                volume: z.number().optional(),
                volumeWeightedAvgPrice: z.number().optional()
              })
              .optional()
              .describe('Current day bar')
          })
        )
        .describe('Options contracts with optional snapshot data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    if (ctx.input.includeSnapshots) {
      let response = await client.getOptionsChainSnapshot({
        underlyingAsset: ctx.input.underlyingTicker,
        contractType: ctx.input.contractType,
        expirationDate: ctx.input.expirationDate,
        expirationDateGte: ctx.input.expirationDateFrom,
        expirationDateLte: ctx.input.expirationDateTo,
        strikePriceGte: ctx.input.strikePriceFrom,
        strikePriceLte: ctx.input.strikePriceTo,
        limit: ctx.input.limit,
        order: ctx.input.order
      });

      let contracts = (response.results || []).map((r: any) => ({
        contractTicker: r.details?.ticker,
        underlyingTicker: r.underlying_asset?.ticker,
        contractType: r.details?.contract_type,
        strikePrice: r.details?.strike_price,
        expirationDate: r.details?.expiration_date,
        exerciseStyle: r.details?.exercise_style,
        sharesPerContract: r.details?.shares_per_contract,
        impliedVolatility: r.implied_volatility,
        openInterest: r.open_interest,
        breakEvenPrice: r.break_even_price,
        greeks: r.greeks
          ? {
              delta: r.greeks.delta,
              gamma: r.greeks.gamma,
              theta: r.greeks.theta,
              vega: r.greeks.vega
            }
          : undefined,
        lastQuote: r.last_quote
          ? {
              bidPrice: r.last_quote.bid,
              bidSize: r.last_quote.bid_size,
              askPrice: r.last_quote.ask,
              askSize: r.last_quote.ask_size,
              midpoint: r.last_quote.midpoint
            }
          : undefined,
        day: r.day
          ? {
              open: r.day.open,
              high: r.day.high,
              low: r.day.low,
              close: r.day.close,
              volume: r.day.volume,
              volumeWeightedAvgPrice: r.day.vwap
            }
          : undefined
      }));

      return {
        output: { contracts },
        message: `Retrieved **${contracts.length}** options snapshots for **${ctx.input.underlyingTicker}** with Greeks and IV.`
      };
    }

    let response = await client.getOptionsContracts({
      underlyingTicker: ctx.input.underlyingTicker,
      contractType: ctx.input.contractType,
      expirationDate: ctx.input.expirationDate,
      expirationDateGte: ctx.input.expirationDateFrom,
      expirationDateLte: ctx.input.expirationDateTo,
      strikePriceGte: ctx.input.strikePriceFrom,
      strikePriceLte: ctx.input.strikePriceTo,
      limit: ctx.input.limit,
      order: ctx.input.order
    });

    let contracts = (response.results || []).map((r: any) => ({
      contractTicker: r.ticker,
      underlyingTicker: r.underlying_ticker,
      contractType: r.contract_type,
      strikePrice: r.strike_price,
      expirationDate: r.expiration_date,
      exerciseStyle: r.exercise_style,
      sharesPerContract: r.shares_per_contract,
      primaryExchange: r.primary_exchange
    }));

    return {
      output: { contracts },
      message: `Retrieved **${contracts.length}** options contracts for **${ctx.input.underlyingTicker}**.`
    };
  })
  .build();
