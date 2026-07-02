import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search and filter users in GoSquared People CRM. Supports free-text search, property/event-based filters, field selection, sorting, and pagination. Returns matching user profiles.`,
  constraints: ['Maximum 250 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Free-text search term to filter people'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of filter objects for property/event-based filtering'),
      fields: z.string().optional().describe('Comma-delimited list of properties to return'),
      sort: z
        .string()
        .optional()
        .describe('Sort field with direction (e.g. "last.seen:desc")'),
      limit: z
        .string()
        .optional()
        .describe('Pagination in format "offset,count" (e.g. "0,10"). Max 250 per request.')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.record(z.string(), z.any()))
        .describe('List of matching user profiles'),
      total: z.number().optional().describe('Total number of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.searchPeople({
      query: ctx.input.query,
      filters: ctx.input.filters,
      fields: ctx.input.fields,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let people = result?.people || [];
    let total = result?.total;

    return {
      output: { people, total },
      message: `Found **${people.length}** people${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
