import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getForexData = SlateTool.create(spec, {
  name: 'Get Forex Data',
  key: 'get_forex_data',
  description: `Retrieve forex market data including currency conversion, last quote for a currency pair, or a snapshot of a forex ticker. Use for real-time exchange rates, currency conversion calculations, or monitoring forex pair performance.`,
  instructions: [
    'For conversions, provide the from and to currency codes (e.g., USD, EUR).',
    'For snapshots, use the C: prefix format (e.g., C:EURUSD).',
    'For last quote, provide the from and to currency codes separately.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z
        .enum(['conversion', 'last_quote', 'snapshot'])
        .describe('Type of forex data to retrieve'),
      fromCurrency: z
        .string()
        .optional()
        .describe('Source currency code (e.g., USD). Required for conversion and last_quote.'),
      toCurrency: z
        .string()
        .optional()
        .describe('Target currency code (e.g., EUR). Required for conversion and last_quote.'),
      amount: z
        .number()
        .optional()
        .describe('Amount to convert. Only used for conversion. Defaults to 1.'),
      precision: z
        .number()
        .int()
        .optional()
        .describe('Decimal precision for conversion result.'),
      ticker: z
        .string()
        .optional()
        .describe('Forex ticker with C: prefix (e.g., C:EURUSD). Required for snapshot.')
    })
  )
  .output(
    z.object({
      conversion: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          initialAmount: z.number().optional(),
          convertedAmount: z.number().optional(),
          lastBid: z.number().optional(),
          lastAsk: z.number().optional(),
          lastTimestamp: z.number().optional()
        })
        .optional()
        .describe('Currency conversion result'),
      lastQuote: z
        .object({
          ask: z.number().optional(),
          bid: z.number().optional(),
          exchange: z.number().optional(),
          timestamp: z.number().optional()
        })
        .optional()
        .describe('Last forex quote'),
      snapshot: z
        .object({
          ticker: z.string().optional(),
          todaysChange: z.number().optional(),
          todaysChangePercent: z.number().optional(),
          day: z
            .object({
              open: z.number().optional(),
              high: z.number().optional(),
              low: z.number().optional(),
              close: z.number().optional(),
              volume: z.number().optional()
            })
            .optional(),
          prevDay: z
            .object({
              open: z.number().optional(),
              high: z.number().optional(),
              low: z.number().optional(),
              close: z.number().optional(),
              volume: z.number().optional()
            })
            .optional(),
          lastQuote: z
            .object({
              ask: z.number().optional(),
              bid: z.number().optional(),
              timestamp: z.number().optional()
            })
            .optional()
        })
        .optional()
        .describe('Forex ticker snapshot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    if (ctx.input.dataType === 'conversion') {
      if (!ctx.input.fromCurrency || !ctx.input.toCurrency) {
        throw new Error('fromCurrency and toCurrency are required for conversion.');
      }
      let response = await client.getForexConversion({
        from: ctx.input.fromCurrency,
        to: ctx.input.toCurrency,
        amount: ctx.input.amount,
        precision: ctx.input.precision
      });
      return {
        output: {
          conversion: {
            from: response.from,
            to: response.to,
            initialAmount: response.initialAmount,
            convertedAmount: response.converted,
            lastBid: response.last?.bid,
            lastAsk: response.last?.ask,
            lastTimestamp: response.last?.timestamp
          }
        },
        message: `Converted **${response.initialAmount} ${response.from}** to **${response.converted} ${response.to}**.`
      };
    }

    if (ctx.input.dataType === 'last_quote') {
      if (!ctx.input.fromCurrency || !ctx.input.toCurrency) {
        throw new Error('fromCurrency and toCurrency are required for last_quote.');
      }
      let response = await client.getForexLastQuote(
        ctx.input.fromCurrency,
        ctx.input.toCurrency
      );
      let lq = response.last;
      return {
        output: {
          lastQuote: lq
            ? {
                ask: lq.ask,
                bid: lq.bid,
                exchange: lq.exchange,
                timestamp: lq.timestamp
              }
            : undefined
        },
        message: lq
          ? `Last forex quote **${ctx.input.fromCurrency}/${ctx.input.toCurrency}**: Bid ${lq.bid} / Ask ${lq.ask}.`
          : `No last quote found.`
      };
    }

    // snapshot
    if (!ctx.input.ticker) {
      throw new Error('ticker is required for snapshot (e.g., C:EURUSD).');
    }
    let response = await client.getForexSnapshot(ctx.input.ticker);
    let t = response.ticker;
    let mapBar = (bar: any) =>
      bar
        ? {
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v
          }
        : undefined;

    return {
      output: {
        snapshot: t
          ? {
              ticker: t.ticker,
              todaysChange: t.todaysChange,
              todaysChangePercent: t.todaysChangePerc,
              day: mapBar(t.day),
              prevDay: mapBar(t.prevDay),
              lastQuote: t.lastQuote
                ? {
                    ask: t.lastQuote.a,
                    bid: t.lastQuote.b,
                    timestamp: t.lastQuote.t
                  }
                : undefined
            }
          : undefined
      },
      message: t
        ? `Forex snapshot for **${t.ticker}**: Change ${t.todaysChangePerc?.toFixed(2)}%.`
        : `No snapshot found for **${ctx.input.ticker}**.`
    };
  })
  .build();
