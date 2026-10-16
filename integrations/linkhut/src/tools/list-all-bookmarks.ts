import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bookmarkSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listAllBookmarks = SlateTool.create(spec, {
  name: 'List All Bookmarks',
  key: 'list_all_bookmarks',
  description: `Retrieve all bookmarks from the user's account with optional filtering by tag and date range. Supports pagination for large collections. Use sparingly — prefer recent bookmarks or filtered queries when possible.`,
  constraints: [
    'Check for updates before fetching a full collection; use sparingly.',
    'Default limit is 1000 results per request, maximum is 100000.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeMeta: z.boolean().optional().describe('Include bookmark change signatures'),
      tag: z.string().optional().describe('Filter by tag'),
      start: z.number().optional().describe('Offset for pagination (0-based)'),
      results: z
        .number()
        .optional()
        .describe('Number of results to return (default: 1000, max: 100000)'),
      fromDate: z
        .string()
        .optional()
        .describe('Return only bookmarks created after this ISO 8601 datetime'),
      toDate: z
        .string()
        .optional()
        .describe('Return only bookmarks created before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      posts: z.array(bookmarkSchema).describe('List of bookmarks'),
      raw: z.unknown().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAllBookmarks({
      tag: ctx.input.tag,
      start: ctx.input.start,
      results: ctx.input.results,
      fromdt: ctx.input.fromDate,
      todt: ctx.input.toDate,
      meta:
        ctx.input.includeMeta === undefined ? undefined : ctx.input.includeMeta ? 'yes' : 'no'
    });

    return {
      output: result,
      message: `Retrieved **${result.posts.length}** bookmark(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();
