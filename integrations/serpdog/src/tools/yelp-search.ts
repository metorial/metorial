import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let yelpSearch = SlateTool.create(spec, {
  name: 'Yelp Search',
  key: 'yelp_search',
  description: `Scrape Yelp search results in real-time. Find businesses, restaurants, and services by location with optional keyword search. Supports sorting by recommendation, rating, or review count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      location: z
        .string()
        .describe('The location to search in (e.g., "New York, NY", "San Francisco, CA")'),
      query: z
        .string()
        .optional()
        .describe(
          'Search query for specific businesses or services (e.g., "pizza", "plumber")'
        ),
      sortBy: z
        .enum(['recommended', 'rating', 'review_count'])
        .optional()
        .describe('Sort results by recommendation (default), highest rated, or most reviewed'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Yelp search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.yelpSearch({
      findLoc: ctx.input.location,
      findDesc: ctx.input.query,
      sortBy: ctx.input.sortBy,
      start: ctx.input.page
    });

    return {
      output: { results: data },
      message: `Searched Yelp in **${ctx.input.location}**${ctx.input.query ? ` for "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
