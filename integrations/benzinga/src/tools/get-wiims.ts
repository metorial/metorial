import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let wiimSchema = z.object({
  wiimId: z.string().optional().describe('Unique WIIMs identifier'),
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
      page: z.number().optional().default(0).describe('Page offset'),
      pageSize: z.number().optional().default(50).describe('Results per page (max 500)')
    })
  )
  .output(
    z.object({
      wiims: z.array(wiimSchema).describe('WIIMs explanations for stock movements'),
      count: z.number().describe('Number of WIIMs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getWiims({
      searchKeys: ctx.input.tickers,
      country: ctx.input.country,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let items = data?.data || (Array.isArray(data) ? data : []);
    let wiims = items.map((item: any) => ({
      wiimId: item.id,
      description: item.description,
      symbol: item.security?.symbol,
      securityName: item.security?.name,
      exchange: item.security?.exchange,
      country: item.security?.country,
      created: item.created ? String(item.created) : undefined,
      updated: item.updated ? String(item.updated) : undefined,
      expired: item.expired ? String(item.expired) : undefined
    }));

    return {
      output: {
        wiims,
        count: wiims.length
      },
      message: `Found **${wiims.length}** WIIMs explanation(s)${ctx.input.tickers ? ` for: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
