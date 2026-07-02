import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `Retrieve a list of people (workers) in the organization. Returns worker profiles including names, emails, employment details, and hiring types. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      hiringTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by hiring type (e.g. "contractor", "employee", "eor_employee")'),
      search: z.string().optional().describe('Search by name or email')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.record(z.string(), z.any()))
        .describe('List of people/worker profiles'),
      total: z.number().optional().describe('Total number of people matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;
    if (ctx.input.hiringTypes) params['hiring_types[]'] = ctx.input.hiringTypes;
    if (ctx.input.search) params.search = ctx.input.search;

    let result = await client.listPeople(params);

    let people = result?.data ?? [];
    let total = result?.page?.total_rows;

    return {
      output: { people, total },
      message: `Found ${people.length} worker(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
