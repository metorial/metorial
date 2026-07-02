import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let searchCandidates = SlateTool.create(spec, {
  name: 'Search Candidates',
  key: 'search_candidates',
  description: `Search and filter candidates using Recruitee's advanced search. Supports filtering by name, email, stage, status, tags, and more. Use **query** for simple text search (name/offer), or **filters** for structured filtering with field/value pairs.

Available filter fields include: \`stages\`, \`status\` (qualified/disqualified), \`tags\`, \`sources\`, \`departments\`, \`offers\`, among others.`,
  instructions: [
    'Use the "query" parameter for simple name/text searches via the basic candidates endpoint.',
    'Use the "filters" parameter for advanced structured search with the search endpoint. Filters is a JSON array like: [{"field": "stages", "has_one_of": ["Applied"]}].'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Simple text search by name or offer title'),
      filters: z
        .string()
        .optional()
        .describe(
          'JSON array of filter objects for advanced search, e.g. [{"field": "status", "in": ["qualified"]}]'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of candidates to return (default 60, max 10000)'),
      page: z
        .number()
        .optional()
        .describe('Page number for paginated results (used with advanced search)'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort field: created_at_desc, created_at_asc, candidate_name_asc, candidate_name_desc, relevance, etc.'
        ),
      offerId: z.number().optional().describe('Filter by job offer ID (basic search only)')
    })
  )
  .output(
    z.object({
      candidates: z
        .array(
          z.object({
            candidateId: z.number().describe('Candidate ID'),
            name: z.string().describe('Full name'),
            emails: z.array(z.string()).describe('Email addresses'),
            phones: z.array(z.string()).describe('Phone numbers'),
            source: z.string().nullable().describe('Primary source'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Matching candidates'),
      total: z
        .number()
        .optional()
        .describe('Total number of matching candidates (advanced search only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    if (ctx.input.filters) {
      // Advanced search endpoint
      let result = await client.searchCandidates({
        limit: ctx.input.limit,
        page: ctx.input.page,
        sortBy: ctx.input.sortBy,
        filtersJson: ctx.input.filters
      });

      let hits = result.hits || [];
      return {
        output: {
          candidates: hits.map((c: any) => ({
            candidateId: c.id,
            name: c.name,
            emails: c.emails || [],
            phones: c.phones || [],
            source: c.source || null,
            createdAt: c.created_at
          })),
          total: result.total
        },
        message: `Found ${result.total ?? hits.length} candidates matching the search criteria.`
      };
    } else {
      // Basic list/search endpoint
      let result = await client.listCandidates({
        query: ctx.input.query,
        limit: ctx.input.limit,
        offerId: ctx.input.offerId,
        sort: ctx.input.sortBy
      });

      let candidates = result.candidates || [];
      return {
        output: {
          candidates: candidates.map((c: any) => ({
            candidateId: c.id,
            name: c.name,
            emails: c.emails || [],
            phones: c.phones || [],
            source: c.source || null,
            createdAt: c.created_at
          }))
        },
        message: `Found ${candidates.length} candidates.`
      };
    }
  })
  .build();
