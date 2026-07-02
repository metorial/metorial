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

export let getBookmarks = SlateTool.create(spec, {
  name: 'Get Bookmarks',
  key: 'get_bookmarks',
  description: `Retrieve bookmarks from Linkhut. Filter by tag, date, specific URL, or URL hash. Without filters, returns bookmarks from the most recent day. Use this for targeted lookups of specific bookmarks.`,
  constraints: [
    'Returns bookmarks from a single day. For bulk retrieval, use List All Bookmarks instead.',
    'Up to 3 tags can be used for filtering.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter by tag (up to 3 tags, space-separated)'),
      date: z
        .string()
        .optional()
        .describe(
          'Filter by date (format: YYYY-MM-DD). Returns bookmarks from this day only.'
        ),
      url: z.string().optional().describe('Retrieve the bookmark for this specific URL'),
      hashes: z
        .string()
        .optional()
        .describe('URL-encoded MD5 hashes to fetch specific bookmarks')
    })
  )
  .output(
    z.object({
      date: z.string().describe('Date of the returned bookmarks'),
      user: z.string().describe('Username of the bookmark owner'),
      posts: z.array(bookmarkSchema).describe('List of matching bookmarks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBookmarks({
      tag: ctx.input.tag,
      dt: ctx.input.date,
      url: ctx.input.url,
      hashes: ctx.input.hashes
    });

    return {
      output: result,
      message: `Found **${result.posts.length}** bookmark(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}${ctx.input.date ? ` from ${ctx.input.date}` : ''}.`
    };
  })
  .build();
