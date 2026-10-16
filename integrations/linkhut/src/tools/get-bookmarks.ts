import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bookmarkSchema } from '../lib/schemas';
import { spec } from '../spec';

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
          'Filter by date (YYYY-MM-DD or UTC YYYY-MM-DDTHH:mm:ssZ). Returns bookmarks from this day only.'
        ),
      url: z.string().optional().describe('Retrieve the bookmark for this specific URL'),
      includeMeta: z.boolean().optional().describe('Include bookmark change signatures'),
      hashes: z
        .string()
        .optional()
        .describe(
          'Space-separated MD5 hashes; URL-encoded spaces and plus separators are also accepted'
        )
    })
  )
  .output(
    z.object({
      date: z.string().optional().describe('Date of the returned bookmarks'),
      user: z.string().optional().describe('Username of the bookmark owner'),
      posts: z.array(bookmarkSchema).describe('List of matching bookmarks'),
      raw: z.unknown().describe('Original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBookmarks({
      tag: ctx.input.tag,
      dt: ctx.input.date,
      url: ctx.input.url,
      hashes: ctx.input.hashes,
      meta:
        ctx.input.includeMeta === undefined ? undefined : ctx.input.includeMeta ? 'yes' : 'no'
    });

    return {
      output: result,
      message: `Found **${result.posts.length}** bookmark(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}${ctx.input.date ? ` from ${ctx.input.date}` : ''}.`
    };
  })
  .build();
