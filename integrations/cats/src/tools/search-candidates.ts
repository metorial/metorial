import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

let candidateSummarySchema = z.object({
  candidateId: z.string().describe('Candidate ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  title: z.string().optional().describe('Title'),
  currentEmployer: z.string().optional().describe('Current employer'),
  isActive: z.boolean().optional().describe('Whether active'),
  isHot: z.boolean().optional().describe('Whether hot')
});

export let searchCandidates = SlateTool.create(spec, {
  name: 'Search Candidates',
  key: 'search_candidates',
  description: `Search for candidates using full-text keyword search or advanced filters. Use **query** for keyword/boolean search across all indexed fields including resumes. Use **filters** for structured field-level filtering with operators like \`exactly\`, \`contains\`, \`between\`, \`greater_than\`, \`less_than\`, \`is_empty\`, and \`geo_distance\`.`,
  instructions: [
    'Provide either a query string OR filters, not both.',
    'Filters use lowercase and/or arrays of conditions and a lowercase not object containing one condition. Each condition uses field, filter, and value keys.',
    'Example filter: { "and": [{ "field": "first_name", "filter": "exactly", "value": "John" }] }'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text/boolean search query string'),
      filters: z
        .any()
        .optional()
        .describe(
          'Advanced filter object using lowercase and/or arrays, a not condition object, and field/filter/value condition keys'
        ),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      candidates: z.array(candidateSummarySchema).describe('Matching candidates'),
      totalCount: z.number().optional().describe('Total number of matching results'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.query !== undefined && ctx.input.filters !== undefined) {
      throw createApiServiceError('Provide query or filters, not both.');
    }
    let data: any;
    if (ctx.input.filters !== undefined) {
      data = await client.filterCandidates(ctx.input.filters, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      data = await client.searchCandidates(ctx.input.query ?? '', {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let candidates = collection(data, 'candidates').map((c: any) => ({
      candidateId: requiredId(c.id, 'record'),
      firstName: c.first_name ?? undefined,
      lastName: c.last_name ?? undefined,
      title: c.title ?? undefined,
      currentEmployer: c.current_employer ?? undefined,
      isActive: c.is_active ?? undefined,
      isHot: c.is_hot ?? undefined
    }));

    return {
      output: {
        candidates,
        totalCount: data?.total ?? undefined,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Found **${candidates.length}** candidate(s).`
    };
  })
  .build();
