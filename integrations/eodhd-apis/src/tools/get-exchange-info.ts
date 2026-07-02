import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let exchangeSchema = z.object({
  Name: z.string().describe('Exchange name'),
  Code: z.string().describe('Exchange code used in API'),
  OperatingMIC: z.string().optional().nullable().describe('Operating MIC code'),
  Country: z.string().describe('Country'),
  Currency: z.string().describe('Default currency'),
  CountryISO2: z.string().optional().nullable().describe('ISO 2-letter country code'),
  CountryISO3: z.string().optional().nullable().describe('ISO 3-letter country code')
});

let tickerSchema = z.object({
  Code: z.string().describe('Ticker symbol'),
  Name: z.string().describe('Instrument name'),
  Country: z.string().describe('Country'),
  Exchange: z.string().describe('Exchange code'),
  Currency: z.string().describe('Trading currency'),
  Type: z.string().describe('Asset type'),
  Isin: z.string().optional().nullable().describe('ISIN identifier')
});

export let getExchangeInfo = SlateTool.create(spec, {
  name: 'Get Exchange Info',
  key: 'get_exchange_info',
  description: `Retrieve information about supported exchanges and their listed instruments. List all 70+ supported exchanges, or get the full symbol list for a specific exchange.`,
  instructions: [
    'Omit exchangeCode to list all supported exchanges',
    'Provide exchangeCode (e.g., US, LSE, XETRA) to list tickers on that exchange'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      exchangeCode: z
        .string()
        .optional()
        .describe(
          'Exchange code to list tickers for (e.g., US, LSE, XETRA). Omit to list all exchanges.'
        ),
      type: z
        .string()
        .optional()
        .describe('Filter tickers by type: common_stock, preferred_stock, etf, fund'),
      includeDelisted: z
        .boolean()
        .optional()
        .describe('Include delisted tickers (default: false)')
    })
  )
  .output(
    z.object({
      exchanges: z
        .array(exchangeSchema)
        .optional()
        .describe('List of supported exchanges (when no exchangeCode provided)'),
      tickers: z
        .array(tickerSchema)
        .optional()
        .describe('List of tickers on the specified exchange')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    if (!ctx.input.exchangeCode) {
      let exchanges = await client.getExchangesList();
      let exchangesList = Array.isArray(exchanges) ? exchanges : [];
      return {
        output: { exchanges: exchangesList },
        message: `Retrieved **${exchangesList.length}** supported exchanges.`
      };
    }

    let tickers = await client.getExchangeSymbols(ctx.input.exchangeCode, {
      type: ctx.input.type,
      delisted: ctx.input.includeDelisted ? 1 : undefined
    });
    let tickersList = Array.isArray(tickers) ? tickers : [];

    return {
      output: { tickers: tickersList },
      message: `Retrieved **${tickersList.length}** tickers from **${ctx.input.exchangeCode}** exchange.`
    };
  })
  .build();
