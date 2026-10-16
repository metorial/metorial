import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageNumber,
  finageRecord,
  finageRecords,
  finageString,
  requiredFinageString,
  validateFinageLimit
} from '../lib/response';
import { spec } from '../spec';

export let listSymbols = SlateTool.create(spec, {
  name: 'List Market Symbols',
  key: 'list_symbols',
  description:
    'Discover supported stock, forex, cryptocurrency pair, and index symbols by market. Search by symbol or name and request subsequent pages to browse the catalog. Use returned symbols in price, historical aggregate, and company detail tools.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      marketType: z
        .enum(['us-stock', 'ca-stock', 'in-stock', 'ru-stock', 'forex', 'crypto', 'index'])
        .describe('Market catalog to browse'),
      page: z
        .number()
        .optional()
        .describe('Positive page number; the provider defaults to page 1'),
      search: z
        .string()
        .optional()
        .describe('Filter by symbol or name, such as BTC or Bitcoin')
    })
  )
  .output(
    z.object({
      page: z.number().optional().describe('Page returned by the provider'),
      symbols: z.array(
        z.object({
          symbol: z.string().describe('Supported market symbol'),
          name: z.string().optional().describe('Instrument or currency pair name')
        })
      ),
      raw: z.unknown().optional().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    validateFinageLimit(ctx.input.page, 'Page');
    let data = await client.listSymbols(
      ctx.input.marketType,
      ctx.input.page,
      ctx.input.search
    );
    let response = finageRecord(data);
    let symbols = finageRecords(data, ['symbols']).map(item => ({
      ...pickDefined({
        name: finageString(item.name)
      }),
      symbol: requiredFinageString(item.symbol, 'a market symbol')
    }));
    return {
      output: { page: finageNumber(response.page), symbols, raw: data },
      message: `Retrieved **${symbols.length}** symbols from the ${ctx.input.marketType} catalog.`
    };
  })
  .build();
