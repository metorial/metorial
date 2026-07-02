import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBookmarkDates = SlateTool.create(spec, {
  name: 'Get Bookmark Dates',
  key: 'get_bookmark_dates',
  description: `Get a count of bookmarks per date. Optionally filter by tag. Returns a map of dates to bookmark counts, useful for understanding bookmarking activity over time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z.string().optional().describe('Filter counts to bookmarks with this tag')
    })
  )
  .output(
    z.object({
      dates: z
        .record(z.string(), z.number())
        .describe('Map of dates (YYYY-MM-DD) to bookmark counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let dates = await client.getBookmarkDates(ctx.input.tag);
    let totalDays = Object.keys(dates).length;

    return {
      output: { dates },
      message: `Found bookmarks across **${totalDays}** day(s)${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}.`
    };
  })
  .build();
