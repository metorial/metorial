import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bookmarkSchema } from '../lib/schemas';
import { spec } from '../spec';

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
      tag: z.string().optional().describe('Filter by tag'),
      count: z
        .number()
        .optional()
        .describe('Number of bookmarks to return (1-100, default: 15)')
    })
  )
  .output(
    z.object({
      date: z.string().optional().describe('Timestamp of the response'),
      user: z.string().optional().describe('Username of the bookmark owner'),
      posts: z.array(bookmarkSchema).describe('List of recent bookmarks'),
      raw: z.unknown().describe('Original provider response')
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
