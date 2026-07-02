import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookmarkSchema = z.object({
  href: z.string().describe('URL of the bookmark'),
  description: z.string().describe('Title of the bookmark'),
  extended: z.string().describe('Extended notes'),
  hash: z.string().describe('MD5 hash of the URL'),
  tag: z.string().describe('Space-separated tags'),
  time: z.string().describe('ISO 8601 timestamp of when the bookmark was created'),
  shared: z.string().describe('Whether the bookmark is public ("yes" or "no")'),
  toread: z.string().describe('Whether the bookmark is marked as unread ("yes" or "no")')
});

export let listAllBookmarks = SlateTool.create(spec, {
  name: 'List All Bookmarks',
  key: 'list_all_bookmarks',
  description: `Retrieve all bookmarks from the user's account with optional filtering by tag and date range. Supports pagination for large collections. Use sparingly — prefer recent bookmarks or filtered queries when possible.`,
  constraints: [
    'Should not be called more than once every 5 minutes.',
    'Default limit is 1000 results per request, maximum is 100000.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter by tag (up to 3 tags, space-separated)'),
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
      posts: z.array(bookmarkSchema).describe('List of bookmarks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let posts = await client.getAllBookmarks({
      tag: ctx.input.tag,
      start: ctx.input.start,
      results: ctx.input.results,
      fromdt: ctx.input.fromDate,
      todt: ctx.input.toDate
    });

    return {
      output: { posts },
      message: `Retrieved **${posts.length}** bookmark(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}${ctx.input.fromDate ? ` from ${ctx.input.fromDate}` : ''}${ctx.input.toDate ? ` to ${ctx.input.toDate}` : ''}.`
    };
  })
  .build();
