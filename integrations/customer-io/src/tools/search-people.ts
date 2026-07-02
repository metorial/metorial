import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search for people in your Customer.io workspace using complex filters. Find people by segment membership, attribute values, or other criteria. Returns up to 1000 people per request.`,
  instructions: [
    'Filters use Customer.io\'s filter syntax. Example: `{"and": [{"segment": {"id": 7}}]}` finds people in segment 7.',
    'Attribute filters: `{"attribute": {"field": "email", "operator": "eq", "value": "test@example.com"}}`.',
    'Supported operators include: eq, ne, exists, not_exists, starts_with, ends_with, contains, not_contains.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .record(z.string(), z.unknown())
        .describe('The filter object using Customer.io filter syntax')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching person records'),
      next: z.string().optional().describe('Pagination cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.searchPeople(ctx.input.filter);
    let people = result?.results ?? result?.customers ?? [];

    return {
      output: {
        people,
        next: result?.next
      },
      message: `Found **${people.length}** matching people.`
    };
  })
  .build();
