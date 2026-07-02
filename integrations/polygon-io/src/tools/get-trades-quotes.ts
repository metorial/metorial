import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tradeSchema = z.object({
  conditions: z.array(z.number()).optional().describe('Trade condition codes'),
  price: z.number().optional().describe('Trade price'),
  size: z.number().optional().describe('Trade size'),
  exchange: z.number().optional().describe('Exchange ID'),
  tradeId: z.string().optional().describe('Trade ID'),
  sipTimestamp: z.number().optional().describe('SIP timestamp (nanoseconds)'),
  participantTimestamp: z.number().optional().describe('Participant timestamp (nanoseconds)'),
  sequenceNumber: z.number().optional().describe('Sequence number')
});

let quoteSchema = z.object({
  bidPrice: z.number().optional().describe('Bid price'),
  bidSize: z.number().optional().describe('Bid size'),
  bidExchange: z.number().optional().describe('Bid exchange ID'),
  askPrice: z.number().optional().describe('Ask price'),
  askSize: z.number().optional().describe('Ask size'),
  askExchange: z.number().optional().describe('Ask exchange ID'),
  conditions: z.array(z.number()).optional().describe('Quote condition codes'),
  sipTimestamp: z.number().optional().describe('SIP timestamp (nanoseconds)'),
  participantTimestamp: z.number().optional().describe('Participant timestamp (nanoseconds)'),
  sequenceNumber: z.number().optional().describe('Sequence number'),
  indicators: z.array(z.number()).optional().describe('Indicator codes')
});

export let getTradesQuotes = SlateTool.create(spec, {
  name: 'Get Trades & Quotes',
  key: 'get_trades_quotes',
  description: `Retrieve tick-level trade and quote (NBBO) data for a stock ticker. Useful for granular market microstructure analysis, auditing executions, or studying bid-ask spread dynamics.`,
  instructions: [
    'Use timestamps in nanoseconds or YYYY-MM-DD format to filter by time range.'
  ],
  constraints: ['Maximum of 50,000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., "AAPL")'),
      dataType: z.enum(['trades', 'quotes']).describe('Type of tick data to retrieve'),
      timestampFrom: z
        .string()
        .optional()
        .describe('Filter for data on or after this timestamp (nanoseconds or YYYY-MM-DD)'),
      timestampTo: z
        .string()
        .optional()
        .describe('Filter for data on or before this timestamp (nanoseconds or YYYY-MM-DD)'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('asc')
        .describe('Sort order by timestamp'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of results (max 50000)')
    })
  )
  .output(
    z.object({
      trades: z.array(tradeSchema).optional().describe('Array of trade records'),
      quotes: z.array(quoteSchema).optional().describe('Array of quote (NBBO) records'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.dataType === 'trades') {
      let data = await client.getTrades({
        ticker: ctx.input.ticker,
        timestampGte: ctx.input.timestampFrom,
        timestampLte: ctx.input.timestampTo,
        order: ctx.input.order,
        sort: 'timestamp',
        limit: ctx.input.limit
      });

      let trades = (data.results || []).map((t: any) => ({
        conditions: t.conditions,
        price: t.price,
        size: t.size,
        exchange: t.exchange,
        tradeId: t.id,
        sipTimestamp: t.sip_timestamp,
        participantTimestamp: t.participant_timestamp,
        sequenceNumber: t.sequence_number
      }));

      return {
        output: {
          trades,
          count: trades.length
        },
        message: `Retrieved **${trades.length}** trade(s) for **${ctx.input.ticker}**.`
      };
    }

    let data = await client.getQuotes({
      ticker: ctx.input.ticker,
      timestampGte: ctx.input.timestampFrom,
      timestampLte: ctx.input.timestampTo,
      order: ctx.input.order,
      sort: 'timestamp',
      limit: ctx.input.limit
    });

    let quotes = (data.results || []).map((q: any) => ({
      bidPrice: q.bid_price,
      bidSize: q.bid_size,
      bidExchange: q.bid_exchange,
      askPrice: q.ask_price,
      askSize: q.ask_size,
      askExchange: q.ask_exchange,
      conditions: q.conditions,
      sipTimestamp: q.sip_timestamp,
      participantTimestamp: q.participant_timestamp,
      sequenceNumber: q.sequence_number,
      indicators: q.indicators
    }));

    return {
      output: {
        quotes,
        count: quotes.length
      },
      message: `Retrieved **${quotes.length}** quote(s) for **${ctx.input.ticker}**.`
    };
  })
  .build();
