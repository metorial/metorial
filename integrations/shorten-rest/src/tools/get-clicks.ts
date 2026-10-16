import { SlateTool } from 'slates';
import { z } from 'zod';
import { clicksOutputSchema, formatClickPage } from '../lib/clicks';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClicks = SlateTool.create(spec, {
  name: 'Get Click Analytics',
  key: 'get_clicks',
  description: `Retrieves clicks for a specific alias and domain by filtering one page of account-wide click data. Includes browser, OS, country, referrer, and user agent. A page may contain no matching clicks and still have more results.`,
  instructions: [
    'Each call retrieves one account-wide page and filters it by alias and domain. limit controls account records examined, not matching clicks returned.',
    'Continue with nextCursor even when clicks is empty. Stop only when nextCursor is absent. Use list_clicks to retrieve account-wide records.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      aliasName: z.string().describe('The alias to get click data for.'),
      domainName: z
        .string()
        .optional()
        .describe('The domain the alias belongs to. Defaults to "short.fyi" if omitted.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Pagination cursor from a previous response to fetch the next page of clicks.'
        ),
      limit: z
        .number()
        .optional()
        .describe(
          'Account-wide records to examine per page, from 1 to 1000. Defaults to 1000; the returned matching click count can be smaller.'
        )
    })
  )
  .output(clicksOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getClicks({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName,
      lastId: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let output = formatClickPage(result);

    return {
      output,
      message: `Retrieved **${output.clicks.length}** matching click(s) for alias \`${ctx.input.aliasName}\` from one account-wide page.${result.lastId ? ' Continue with nextCursor to inspect the next page.' : ''}`
    };
  })
  .build();
