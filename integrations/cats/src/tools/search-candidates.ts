import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    'Filters use boolean logic: wrap conditions in AND, OR, NOT objects.',
    'Example filter: { "AND": [{ "field": "first_name", "operator": "exactly", "value": "John" }] }'
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
          'Advanced filter object with boolean logic (AND, OR, NOT) and field-level operators'
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

    let data: any;
    if (ctx.input.filters) {
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

    let candidates = (data?._embedded?.candidates ?? []).map((c: any) => ({
      candidateId: c.id?.toString() ?? '',
      firstName: c.first_name,
      lastName: c.last_name,
      title: c.title,
      currentEmployer: c.current_employer,
      isActive: c.is_active,
      isHot: c.is_hot
    }));

    return {
      output: {
        candidates,
        totalCount: data?.total ?? candidates.length,
        currentPage: data?.page ?? ctx.input.page ?? 1
      },
      message: `Found **${candidates.length}** candidate(s).`
    };
  })
  .build();
