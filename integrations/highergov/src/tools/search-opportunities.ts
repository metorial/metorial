import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchOpportunities = SlateTool.create(spec, {
  name: 'Search Opportunities',
  key: 'search_opportunities',
  description: `Search federal contract opportunities (SAM.gov), DLA/DIBBS opportunities, state and local (SLED) opportunities, grant opportunities, and SBIR opportunities. Use **sourceType** to filter by source. Combine with a **searchId** from a saved HigherGov search to replicate complex search criteria. Results include title, description, agency info, due dates, NAICS/PSC codes, estimated values, and contact information.`,
  instructions: [
    'Use sourceType to narrow results to a specific source (sam, dibbs, sbir, grant, sled).',
    'Use searchId to apply a saved HigherGov search configuration for complex multi-field filtering.',
    'When using searchId with the opportunity endpoint, also pass sourceType and capturedDate for best results.'
  ],
  constraints: [
    'Maximum page size is 100 records.',
    'Base subscription includes 10,000 records/month.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      oppKey: z
        .string()
        .optional()
        .describe('HigherGov opportunity identifier to look up a specific opportunity'),
      versionKey: z.string().optional().describe('HigherGov opportunity version identifier'),
      sourceId: z
        .string()
        .optional()
        .describe('Source-specific opportunity identifier (e.g. SAM.gov solicitation number)'),
      sourceType: z
        .enum(['sam', 'dibbs', 'sbir', 'grant', 'sled'])
        .optional()
        .describe('Filter by opportunity source type'),
      agencyKey: z.number().optional().describe('HigherGov agency key to filter by agency'),
      capturedDate: z
        .string()
        .optional()
        .describe('Filter to opportunities captured on or after this date (YYYY-MM-DD)'),
      postedDate: z
        .string()
        .optional()
        .describe('Filter to opportunities posted on or after this date (YYYY-MM-DD)'),
      searchId: z
        .string()
        .optional()
        .describe('HigherGov saved search ID to apply complex search filters'),
      ordering: z
        .enum([
          'captured_date',
          '-captured_date',
          'due_date',
          '-due_date',
          'posted_date',
          '-posted_date'
        ])
        .optional()
        .describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      opportunities: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of opportunity records'),
      totalCount: z.number().describe('Total number of matching opportunities'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getOpportunities({
      oppKey: ctx.input.oppKey,
      versionKey: ctx.input.versionKey,
      sourceId: ctx.input.sourceId,
      sourceType: ctx.input.sourceType,
      agencyKey: ctx.input.agencyKey,
      capturedDate: ctx.input.capturedDate,
      postedDate: ctx.input.postedDate,
      searchId: ctx.input.searchId,
      ordering: ctx.input.ordering,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        opportunities: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** opportunities (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
