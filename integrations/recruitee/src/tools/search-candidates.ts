import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { fail, integer } from '../lib/validation';
import { spec } from '../spec';
export let searchCandidates = SlateTool.create(spec, {
  name: 'Search Candidates',
  key: 'search_candidates',
  description:
    'Search one page of candidates. Basic query searches names and offer titles; filters selects the documented advanced search with JSON filter objects.',
  instructions: [
    'Basic search uses limit and offset, or page translated to an offset. Advanced search uses page and filters, for example [{"field":"status","in":["qualified"]}] or [{"filter":"stages","name":{"in":["Applied"]}}]. Do not combine filters with query, offerId, or offset.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Basic text search by name or offer title'),
      filters: z
        .string()
        .optional()
        .describe('JSON array of current documented advanced filter objects'),
      limit: z
        .number()
        .optional()
        .describe(
          'Page size, default 60. Basic search: exact integer from 1 to 1000. Advanced search: exact integer from 1 to 10000'
        ),
      page: z
        .number()
        .optional()
        .describe('One-based page; basic search translates this to an offset'),
      offset: z.number().optional().describe('Basic search offset; do not combine with page'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Basic: by_date or by_last_message. Advanced: a documented field followed by _asc or _desc, such as created_at_desc'
        ),
      offerId: z.number().optional().describe('Offer ID for basic search only')
    })
  )
  .output(
    z.object({
      candidates: z.array(
        z.object({
          candidateId: z.number(),
          name: z.string(),
          emails: z.array(z.string()),
          phones: z.array(z.string()),
          source: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      total: z.number().optional().describe('Actual advanced-search total when provided'),
      page: z.number().optional().describe('Requested advanced-search page'),
      offset: z.number().optional().describe('Requested basic-search offset'),
      nextOffset: z
        .number()
        .optional()
        .describe(
          'Suggested basic offset when a full page was returned; request it to determine whether more records exist'
        )
    })
  )
  .handleInvocation(async ctx => {
    const limit = integer(
      ctx.input.limit ?? 60,
      ctx.input.filters === undefined ? 'Basic candidate limit' : 'Advanced candidate limit',
      1,
      ctx.input.filters === undefined ? 1000 : 10000
    );
    const page = integer(ctx.input.page ?? 1, 'Page');
    if (
      ctx.input.filters !== undefined &&
      (ctx.input.query !== undefined ||
        ctx.input.offerId !== undefined ||
        ctx.input.offset !== undefined)
    )
      fail(
        'Advanced filters cannot be combined with query, offerId, or offset. Express those criteria in filters.'
      );
    if (ctx.input.offset !== undefined && ctx.input.page !== undefined)
      fail('Use offset or page for basic search, not both.');
    const offset = integer(ctx.input.offset ?? (page - 1) * limit, 'Offset', 0);
    const client = await RecruiteeClient.forContext(ctx);
    if (ctx.input.filters !== undefined) {
      const result = await client.searchCandidates({
        limit,
        page,
        sortBy: ctx.input.sortBy,
        filtersJson: ctx.input.filters
      });
      return {
        output: {
          candidates: result.hits.map(c => ({
            candidateId: c.id,
            name: c.name,
            emails: c.emails,
            phones: c.phones,
            source: c.source,
            createdAt: c.created_at
          })),
          total: result.total,
          page
        },
        message: `Returned ${result.hits.length} candidates from advanced search.`
      };
    }
    const result = await client.listCandidates({
      query: ctx.input.query,
      limit,
      offset,
      offerId: ctx.input.offerId,
      sort: ctx.input.sortBy
    });
    return {
      output: {
        candidates: result.candidates.map(c => ({
          candidateId: c.id,
          name: c.name,
          emails: c.emails,
          phones: c.phones,
          source: c.source,
          createdAt: c.created_at
        })),
        offset,
        ...(result.candidates.length === limit && Number.isSafeInteger(offset + limit)
          ? { nextOffset: offset + limit }
          : {})
      },
      message: `Returned ${result.candidates.length} candidates from offset ${offset}.`
    };
  })
  .build();
