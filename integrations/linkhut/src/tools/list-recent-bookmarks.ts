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

export let listRecentBookmarks = SlateTool.create(spec, {
  name: 'List Recent Bookmarks',
  key: 'list_recent_bookmarks',
  description: `Retrieve the most recently added bookmarks. Optionally filter by tag and limit the number of results. Useful for getting a quick overview of recent bookmarking activity.`,
  constraints: ['Maximum of 100 bookmarks can be returned.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter by tag (up to 3 tags, space-separated)'),
      count: z
        .number()
        .optional()
        .describe('Number of bookmarks to return (1-100, default: 15)')
    })
  )
  .output(
    z.object({
      date: z.string().describe('Timestamp of the response'),
      user: z.string().describe('Username of the bookmark owner'),
      posts: z.array(bookmarkSchema).describe('List of recent bookmarks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getRecentBookmarks({
      tag: ctx.input.tag,
      count: ctx.input.count
    });

    return {
      output: result,
      message: `Retrieved **${result.posts.length}** recent bookmark(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}.`
    };
  })
  .build();
