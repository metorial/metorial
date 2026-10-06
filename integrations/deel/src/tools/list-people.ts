import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import type { DeelParameters } from '../lib/client';
import {
  dataList,
  pageSchema,
  responsePage,
  validateLimit,
  validateOffset
} from '../lib/response';
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
  .scopes(anyOf('people:read'))
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      hiringTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by hiring type (e.g. "contractor", "direct_employee", "eor")'),
      search: z.string().optional().describe('Search by name or email')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.record(z.string(), z.any()))
        .describe('List of people/worker profiles'),
      total: z.number().optional().describe('Total number of people matching the filter'),
      page: pageSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    validateLimit(ctx.input.limit, 200);
    validateOffset(ctx.input.offset);
    let client = createClient(ctx);

    let params: DeelParameters = {};
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.offset !== undefined) params.offset = ctx.input.offset;
    if (ctx.input.hiringTypes) params.hiring_types = ctx.input.hiringTypes;
    if (ctx.input.search) params.search = ctx.input.search;

    let result = await client.listPeople(params);

    let people = dataList(result, 'people');
    let page = responsePage(result);
    let total = page?.total_rows;

    return {
      output: { people, total, page },
      message: `Found ${people.length} worker(s)${total !== undefined ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
