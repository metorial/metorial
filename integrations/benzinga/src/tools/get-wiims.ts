import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient, recordsFrom, stringValue } from '../lib/client';
import { spec } from '../spec';

let wiimSchema = z.object({
  wiimId: z.string().optional().describe('Unique WIIMs identifier'),
  title: z.string().optional().describe('Original headline'),
  body: z.string().optional().describe('Original article body in HTML'),
  url: z.string().optional().describe('Original article URL'),
  description: z.string().optional().describe('Explanation for why the stock is moving'),
  symbol: z.string().optional().describe('Ticker symbol'),
  securityName: z.string().optional().describe('Security name'),
  exchange: z.string().optional().describe('Exchange'),
  country: z.string().optional().describe('Country'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last update timestamp'),
  expired: z.string().optional().describe('Expiration timestamp')
});

export let getWiimsTool = SlateTool.create(spec, {
  name: 'Get Why Is It Moving',
  key: 'get_wiims',
  description: `Retrieve "Why Is It Moving" (WIIMs) data that provides short explanations for why a stock is moving on any given day. Useful for quickly understanding the catalyst behind price movements.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z.string().optional().describe('Comma-separated ticker symbols (max 50)'),
      country: z.string().optional().describe('Country code filter'),
      updatedSince: z
        .number()
        .optional()
        .describe('Return records updated since this Unix timestamp in seconds'),
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      wiims: z.array(wiimSchema).describe('WIIMs explanations for stock movements'),
      raw: z.unknown().optional().describe('Complete provider response'),
      count: z.number().describe('Number of WIIMs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getWiims({
      searchKeys: ctx.input.tickers,
      country: ctx.input.country,
      updatedSince: ctx.input.updatedSince,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = recordsFrom(data);
    let wiims = items.flatMap(item => {
      let stocks =
        Array.isArray(item.stocks) && item.stocks.length ? item.stocks : [item.security ?? {}];
      return stocks.map((stock: any) => ({
        wiimId: stringValue(item.id),
        description: item.description ?? item.title,
        title: item.title,
        body: item.body,
        url: item.url,
        symbol: stock.symbol ?? stock.name,
        securityName: stock.symbol ? stock.name : undefined,
        exchange: stock.exchange,
        country: stock.country,
        created: stringValue(item.created),
        updated: stringValue(item.updated),
        expired: stringValue(item.expired)
      }));
    });

    return {
      output: {
        raw: data,
        wiims,
        count: wiims.length
      },
      message: `Found **${wiims.length}** WIIMs explanation(s)${ctx.input.tickers ? ` for: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
