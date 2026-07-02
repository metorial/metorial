import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchGrantAwards = SlateTool.create(spec, {
  name: 'Search Grant Awards',
  key: 'search_grant_awards',
  description: `Search 4M+ federal prime grant awards and subgrant awards. Use **awardType** to select between prime grants or subgrants. Filter by awardee, agency, CFDA program number, modification date, or saved search criteria. Returns award details including obligation amounts, federal/non-federal funding, performance periods, and program references.`,
  instructions: [
    'Use awardType "prime" for prime grant awards and "subgrant" for subgrant awards.',
    'Filter by cfdaProgramNumber to find grants under a specific assistance program.',
    'Use lastModifiedDate to get recently modified awards.'
  ],
  constraints: ['Maximum page size is 100 records.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      awardType: z
        .enum(['prime', 'subgrant'])
        .default('prime')
        .describe('Type of grant award to search'),
      awardeeKey: z.number().optional().describe('HigherGov awardee key'),
      awardeeKeyParent: z.number().optional().describe('HigherGov parent-level awardee key'),
      awardeeUei: z.string().optional().describe('Awardee UEI (Unique Entity Identifier)'),
      awardeeUeiParent: z.string().optional().describe('Parent awardee UEI'),
      awardingAgencyKey: z.number().optional().describe('HigherGov awarding agency key'),
      fundingAgencyKey: z.number().optional().describe('HigherGov funding agency key'),
      lastModifiedDate: z
        .string()
        .optional()
        .describe('Filter to awards modified on or after this date (YYYY-MM-DD)'),
      cfdaProgramNumber: z
        .string()
        .optional()
        .describe(
          'CFDA/Assistance Listing program number (e.g. "93.778") - prime grants only'
        ),
      searchId: z
        .string()
        .optional()
        .describe('HigherGov saved search ID (prime grants only)'),
      ordering: z
        .string()
        .optional()
        .describe('Sort order (e.g. -action_date, -total_obligated_amount)'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      awards: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of grant award records'),
      totalCount: z.number().describe('Total number of matching awards'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let response: any;
    if (input.awardType === 'subgrant') {
      response = await client.getSubgrants({
        awardeeKey: input.awardeeKey,
        awardeeKeyParent: input.awardeeKeyParent,
        awardeeUei: input.awardeeUei,
        awardeeUeiParent: input.awardeeUeiParent,
        awardingAgencyKey: input.awardingAgencyKey,
        fundingAgencyKey: input.fundingAgencyKey,
        lastModifiedDate: input.lastModifiedDate,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else {
      response = await client.getGrants({
        awardeeKey: input.awardeeKey,
        awardeeKeyParent: input.awardeeKeyParent,
        awardeeUei: input.awardeeUei,
        awardeeUeiParent: input.awardeeUeiParent,
        awardingAgencyKey: input.awardingAgencyKey,
        fundingAgencyKey: input.fundingAgencyKey,
        lastModifiedDate: input.lastModifiedDate,
        cfdaProgramNumber: input.cfdaProgramNumber,
        searchId: input.searchId,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    }

    let typeLabel = input.awardType === 'subgrant' ? 'subgrant' : 'prime grant';

    return {
      output: {
        awards: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** ${typeLabel} awards (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
