import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { optionalString, records, requiredString } from '../lib/response';
import { spec } from '../spec';

let symbolResultSchema = z.object({
  symbol: z.string().describe('Ticker symbol'),
  instrumentName: z.string().optional().describe('Full name of the instrument'),
  exchange: z.string().optional().describe('Exchange where traded'),
  micCode: z.string().optional().describe('Market Identifier Code'),
  exchangeTimezone: z.string().optional().describe('Exchange timezone'),
  instrumentType: z
    .string()
    .optional()
    .describe('Type of instrument (e.g., Common Stock, ETF, Digital Currency)'),
  country: z.string().optional().describe('Country of the exchange'),
  currency: z.string().optional().describe('Currency of the instrument')
});

export let searchSymbols = SlateTool.create(spec, {
  name: 'Search Symbols',
  key: 'search_symbols',
  description: `Search for financial instruments by name, ticker symbol, or keyword across all supported exchanges and asset types.
Returns matching symbols with their exchange, instrument type, country, and currency.
Use this to find the correct symbol before making other data requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query - can be a symbol, company name, or keyword (e.g., "Apple", "AAPL", "bitcoin")'
        ),
      outputsize: z
        .number()
        .optional()
        .describe('Number of results to return (default: 30, max: 120)')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      results: z.array(symbolResultSchema).describe('Array of matching symbols'),
      totalCount: z.number().describe('Total number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.searchSymbols({
      symbol: ctx.input.query,
      outputsize: ctx.input.outputsize
    });

    let data = records(result.data, 'data');
    let results = data.map((item: any) => ({
      symbol: requiredString(item.symbol, 'data.symbol'),
      instrumentName: optionalString(item.instrument_name),
      exchange: optionalString(item.exchange),
      micCode: optionalString(item.mic_code),
      exchangeTimezone: optionalString(item.exchange_timezone),
      instrumentType: optionalString(item.instrument_type),
      country: optionalString(item.country),
      currency: optionalString(item.currency)
    }));

    return {
      output: {
        raw: result,
        results,
        totalCount: results.length
      },
      message: `Found **${results.length}** results for "${ctx.input.query}".`
    };
  })
  .build();
