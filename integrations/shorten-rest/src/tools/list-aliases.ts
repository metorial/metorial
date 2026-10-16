import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAliases = SlateTool.create(spec, {
  name: 'List Short URLs',
  key: 'list_aliases',
  description: `Lists a page of alias names for a given domain, newest first. Use nextCursor to fetch subsequent pages.`,
  instructions: [
    'To paginate, pass nextCursor from the previous response as cursor for the next request.'
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
        .describe('nextCursor from a previous response to fetch the next page.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Aliases per page, from 1 to 1000. Defaults to 1000.')
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
      lastId: ctx.input.cursor,
      limit: ctx.input.limit
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
