import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `Retrieve customer profiles from a Squarespace merchant site. Profiles include customers, mailing list subscribers, and donors with their contact information and commerce transaction summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      filter: z.string().optional().describe('Filter expression to narrow results')
    })
  )
  .output(
    z.object({
      profiles: z.array(z.any()).describe('Array of customer profile objects'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProfiles({
      cursor: ctx.input.cursor,
      filter: ctx.input.filter
    });

    return {
      output: {
        profiles: result.profiles,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.profiles.length}** profile(s).${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
