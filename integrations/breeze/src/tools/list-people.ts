import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List people from the church database with optional filtering. Supports filtering by tags, status, and custom profile fields. Returns basic info (ID and name) by default, or full details when requested.`,
  constraints: [
    'Responses may be cached and lag up to 15 minutes behind the live site.',
    'Rate limit: 20 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of people to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      details: z
        .boolean()
        .optional()
        .describe('Set to true to return full person details instead of just ID and name'),
      tagIds: z.array(z.string()).optional().describe('Filter people by tag IDs'),
      status: z
        .string()
        .optional()
        .describe('Filter people by status (e.g., "active", "inactive", "archived")')
    })
  )
  .output(
    z.object({
      people: z.array(z.any()).describe('Array of person records')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let filterJson: string | undefined;
    let filters: Record<string, unknown>[] = [];

    if (ctx.input.tagIds?.length) {
      filters.push({ tag_contains: ctx.input.tagIds.join(',') });
    }
    if (ctx.input.status) {
      filters.push({ status_id: ctx.input.status });
    }
    if (filters.length > 0) {
      filterJson = JSON.stringify(filters.length === 1 ? filters[0] : filters);
    }

    let people = await client.listPeople({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      details: ctx.input.details,
      filterJson
    });

    let peopleArray = Array.isArray(people) ? people : [];

    return {
      output: { people: peopleArray },
      message: `Found **${peopleArray.length}** people.`
    };
  })
  .build();
