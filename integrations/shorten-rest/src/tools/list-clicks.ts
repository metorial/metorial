import { SlateTool } from 'slates';
import { z } from 'zod';
import { clicksOutputSchema, formatClickPage } from '../lib/clicks';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClicks = SlateTool.create(spec, {
  name: 'List Account Clicks',
  key: 'list_clicks',
  description:
    'Retrieves one page of click records across the connected account, newest first. Includes alias, domain, destination, browser, OS, country, referrer, and user agent.',
  instructions: [
    'Pass nextCursor from a response as cursor to fetch the next page. Use get_clicks to filter each account page for a specific alias and domain.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('nextCursor returned by a previous page.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Records per page, from 1 to 1000. Defaults to 1000.')
    })
  )
  .output(clicksOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).listClicks({
      lastId: ctx.input.cursor,
      limit: ctx.input.limit
    });
    let output = formatClickPage(result);
    return {
      output,
      message: `Retrieved **${output.clicks.length}** account click(s).${output.nextCursor ? ' More results are available with nextCursor.' : ''}`
    };
  })
  .build();
