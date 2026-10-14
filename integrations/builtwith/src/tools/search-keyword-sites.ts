import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchKeywordSites = SlateTool.create(spec, {
  name: 'Search Sites by Keyword',
  key: 'search_keyword_sites',
  description:
    'Find websites containing a keyword and retrieve additional pages using the returned cursor.',
  instructions: [
    'Pass nextOffset as offset for the next page. END means there are no more results.'
  ],
  constraints: [
    'Keywords must contain at least four alphabetical characters and cannot be common stop words.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      keyword: z
        .string()
        .regex(/^[A-Za-z]{4,}$/)
        .describe('A single alphabetical keyword of at least four letters, such as perfume'),
      limit: z
        .number()
        .min(16)
        .max(1000)
        .optional()
        .describe('Whole-number page size from 16 to 1000; default 100'),
      offset: z
        .string()
        .optional()
        .describe('The exact nextOffset returned by a previous page')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('Keyword searched'),
      domains: z.array(z.string()).describe('Domains containing the keyword'),
      nextOffset: z
        .string()
        .optional()
        .describe('Cursor for the next page; END means there are no more results'),
      hasMore: z.boolean().describe('Whether another page is available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.keywordSearch(
      ctx.input.keyword,
      ctx.input.limit,
      ctx.input.offset
    );
    let nextOffset = typeof data?.NextOffset === 'string' ? data.NextOffset : undefined;
    let domains = data?.Domains ?? [];
    return {
      output: {
        keyword: data?.Keyword ?? ctx.input.keyword,
        domains,
        nextOffset,
        hasMore: nextOffset !== undefined && nextOffset !== 'END'
      },
      message: `Found **${domains.length}** sites matching **${ctx.input.keyword}**.`
    };
  });
