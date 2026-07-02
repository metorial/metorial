import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAliases = SlateTool.create(spec, {
  name: 'List Short URLs',
  key: 'list_aliases',
  description: `Lists all alias names for a given domain. Results are paginated; use the returned \`lastId\` value to fetch subsequent pages.`,
  instructions: [
    'To paginate, pass the lastId from the previous response as the cursor for the next request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .optional()
        .describe('Domain to list aliases for. Defaults to "short.fyi" if omitted.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Pagination cursor from a previous response (the lastId value) to fetch the next page.'
        )
    })
  )
  .output(
    z.object({
      aliases: z.array(z.string()).describe('List of alias names on the domain.'),
      nextCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page. Absent if no more results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listAliases({
      domainName: ctx.input.domainName,
      lastId: ctx.input.cursor
    });

    return {
      output: {
        aliases: result.aliases,
        nextCursor: result.lastId || undefined
      },
      message: `Found **${result.aliases.length}** alias(es)${ctx.input.domainName ? ` on domain \`${ctx.input.domainName}\`` : ''}.${result.lastId ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
