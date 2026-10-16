import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuotes = SlateTool.create(spec, {
  name: 'Get Quotes',
  key: 'get_quotes',
  description: `Retrieve inspirational, philosophical, or topical quotes. Filter by category (e.g. wisdom, success, love) or author. Great for content generation, daily inspiration, or finding quotes for a specific context.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      work: z.string().optional().describe('Filter by source work title'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page; premium only'),
      offset: z.number().int().min(0).optional().describe('Results to skip; premium only'),
      safe: z.boolean().optional().describe('Restrict to safe quotes; premium only'),
      categories: z
        .string()
        .optional()
        .describe('Comma-separated list of categories to include (e.g. "wisdom,success")'),
      excludeCategories: z
        .string()
        .optional()
        .describe('Comma-separated list of categories to exclude'),
      author: z.string().optional().describe('Filter by author name (partial match supported)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      quotes: z
        .array(
          z.object({
            quote: z.string().describe('The quote text'),
            author: z.string().describe('Quote author'),
            work: z.string().optional().describe('Source work or book'),
            categories: z.array(z.string()).optional().describe('Associated categories')
          })
        )
        .describe('List of quotes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number | boolean> = {};
    if (ctx.input.work !== undefined) params.work = ctx.input.work;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.safe !== undefined) params.safe = ctx.input.safe;
    if (ctx.input.categories) params.categories = ctx.input.categories;
    if (ctx.input.excludeCategories) params.exclude_categories = ctx.input.excludeCategories;
    if (ctx.input.author) params.author = ctx.input.author;

    let result = await client.getQuotes(params);
    let quotes = Array.isArray(result) ? result : [result];

    return {
      output: {
        raw: result,
        quotes: quotes.map((q: any) => ({
          quote: q.quote,
          author: q.author,
          work: q.work ?? undefined,
          categories: q.categories ?? undefined
        }))
      },
      message:
        quotes.length > 0
          ? `> "${quotes[0].quote}"\n> — *${quotes[0].author}*`
          : 'No quotes found matching the criteria.'
    };
  })
  .build();
