import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getStockTradesAndQuotes = SlateTool.create(spec, {
  name: 'Get Stock Trades & Quotes',
  key: 'get_stock_trades_quotes',
  description: `Retrieve recent trades, quotes (NBBO), last trade, or last quote for a stock ticker. Useful for tick-level analysis, monitoring trade activity, or getting the latest bid/ask spread. Choose the type of data you need via the \`dataType\` field.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., AAPL)'),
      dataType: z
        .enum(['trades', 'quotes', 'last_trade', 'last_quote'])
        .describe('Type of data to retrieve'),
      timestampFrom: z
        .string()
        .optional()
        .describe('Filter results from this timestamp (YYYY-MM-DD or nanosecond timestamp)'),
      timestampTo: z
        .string()
        .optional()
        .describe('Filter results up to this timestamp (YYYY-MM-DD or nanosecond timestamp)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by timestamp'),
      limit: z.number().int().optional().describe('Max number of results to return'),
      sort: z.string().optional().describe('Field to sort by (e.g., timestamp)')
    })
  )
  .output(
    z.object({
      trades: z
        .array(
          z.object({
            price: z.number().optional(),
            size: z.number().optional(),
            timestamp: z.number().optional(),
            conditions: z.array(z.number()).optional(),
            exchange: z.number().optional(),
            sequenceNumber: z.number().optional(),
            trfTimestamp: z.number().optional(),
            sipTimestamp: z.number().optional()
          })
        )
        .optional()
        .describe('Trade results'),
      quotes: z
        .array(
          z.object({
            bidPrice: z.number().optional(),
            bidSize: z.number().optional(),
            askPrice: z.number().optional(),
            askSize: z.number().optional(),
            bidExchange: z.number().optional(),
            askExchange: z.number().optional(),
            timestamp: z.number().optional(),
            sipTimestamp: z.number().optional(),
            conditions: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Quote results'),
      lastTrade: z
        .object({
          price: z.number().optional(),
          size: z.number().optional(),
          timestamp: z.number().optional(),
          exchange: z.number().optional(),
          conditions: z.array(z.number()).optional()
        })
        .optional()
        .describe('Last trade'),
      lastQuote: z
        .object({
          bidPrice: z.number().optional(),
          bidSize: z.number().optional(),
          askPrice: z.number().optional(),
          askSize: z.number().optional(),
          timestamp: z.number().optional()
        })
        .optional()
        .describe('Last quote (NBBO)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    if (ctx.input.dataType === 'trades') {
      let response = await client.getTrades({
        ticker: ctx.input.ticker,
        timestampGte: ctx.input.timestampFrom,
        timestampLte: ctx.input.timestampTo,
        order: ctx.input.order,
        limit: ctx.input.limit,
        sort: ctx.input.sort
      });
      let trades = (response.results || []).map((t: any) => ({
        price: t.price,
        size: t.size,
        timestamp: t.sip_timestamp || t.participant_timestamp,
        conditions: t.conditions,
        exchange: t.exchange,
        sequenceNumber: t.sequence_number,
        trfTimestamp: t.trf_timestamp,
        sipTimestamp: t.sip_timestamp
      }));
      return {
        output: { trades },
        message: `Retrieved **${trades.length}** trades for **${ctx.input.ticker}**.`
      };
    }

    if (ctx.input.dataType === 'quotes') {
      let response = await client.getQuotes({
        ticker: ctx.input.ticker,
        timestampGte: ctx.input.timestampFrom,
        timestampLte: ctx.input.timestampTo,
        order: ctx.input.order,
        limit: ctx.input.limit,
        sort: ctx.input.sort
      });
      let quotes = (response.results || []).map((q: any) => ({
        bidPrice: q.bid_price,
        bidSize: q.bid_size,
        askPrice: q.ask_price,
        askSize: q.ask_size,
        bidExchange: q.bid_exchange,
        askExchange: q.ask_exchange,
        timestamp: q.sip_timestamp || q.participant_timestamp,
        sipTimestamp: q.sip_timestamp,
        conditions: q.conditions
      }));
      return {
        output: { quotes },
        message: `Retrieved **${quotes.length}** quotes for **${ctx.input.ticker}**.`
      };
    }

    if (ctx.input.dataType === 'last_trade') {
      let response = await client.getLastTrade(ctx.input.ticker);
      let lt = response.results;
      return {
        output: {
          lastTrade: lt
            ? {
                price: lt.p,
                size: lt.s,
                timestamp: lt.t,
                exchange: lt.x,
                conditions: lt.c
              }
            : undefined
        },
        message: lt
          ? `Last trade for **${ctx.input.ticker}**: $${lt.p} (size: ${lt.s}).`
          : `No last trade found for **${ctx.input.ticker}**.`
      };
    }

    // last_quote
    let response = await client.getLastQuote(ctx.input.ticker);
    let lq = response.results;
    return {
      output: {
        lastQuote: lq
          ? {
              bidPrice: lq.P,
              bidSize: lq.S,
              askPrice: lq.p,
              askSize: lq.s,
              timestamp: lq.t
            }
          : undefined
      },
      message: lq
        ? `Last quote for **${ctx.input.ticker}**: Bid $${lq.P} / Ask $${lq.p}.`
        : `No last quote found for **${ctx.input.ticker}**.`
    };
  })
  .build();
