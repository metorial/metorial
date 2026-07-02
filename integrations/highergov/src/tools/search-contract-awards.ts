import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchContractAwards = SlateTool.create(spec, {
  name: 'Search Contract Awards',
  key: 'search_contract_awards',
  description: `Search 61M+ federal prime contract awards, IDV (Indefinite Delivery Vehicle) awards, and subcontract awards. Use **awardType** to select between prime contracts, IDVs, or subcontracts. Filter by awardee, agency, NAICS/PSC codes, contract vehicle, modification date, or saved search criteria. Useful for competitive analysis, incumbent identification, and market research.`,
  instructions: [
    'Use awardType to select the contract type: "prime" for prime contracts, "idv" for indefinite delivery vehicles, "subcontract" for subcontract awards.',
    'Filter by awardeeUei or awardeeKey to find contracts for a specific company.',
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
        .enum(['prime', 'idv', 'subcontract'])
        .default('prime')
        .describe('Type of contract award to search'),
      awardId: z.string().optional().describe('Specific contract award ID'),
      parentAwardId: z
        .string()
        .optional()
        .describe('Parent award ID to find task orders under a contract'),
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
      naicsCode: z
        .string()
        .optional()
        .describe('NAICS code to filter by industry classification'),
      pscCode: z.string().optional().describe('Product Service Code to filter by'),
      searchId: z
        .string()
        .optional()
        .describe('HigherGov saved search ID (prime contracts only)'),
      vehicleKey: z
        .number()
        .optional()
        .describe('HigherGov contract vehicle key (prime and IDV only)'),
      ordering: z
        .string()
        .optional()
        .describe('Sort order (e.g. -action_date, -current_total_value_of_award)'),
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
        .describe('List of contract award records'),
      totalCount: z.number().describe('Total number of matching awards'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let response: any;
    if (input.awardType === 'idv') {
      response = await client.getIdvAwards({
        awardId: input.awardId,
        awardeeKey: input.awardeeKey,
        awardeeKeyParent: input.awardeeKeyParent,
        awardeeUei: input.awardeeUei,
        awardeeUeiParent: input.awardeeUeiParent,
        awardingAgencyKey: input.awardingAgencyKey,
        fundingAgencyKey: input.fundingAgencyKey,
        lastModifiedDate: input.lastModifiedDate,
        naicsCode: input.naicsCode,
        pscCode: input.pscCode,
        parentAwardId: input.parentAwardId,
        vehicleKey: input.vehicleKey,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else if (input.awardType === 'subcontract') {
      response = await client.getSubcontracts({
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
      response = await client.getContracts({
        awardId: input.awardId,
        awardeeKey: input.awardeeKey,
        awardeeKeyParent: input.awardeeKeyParent,
        awardeeUei: input.awardeeUei,
        awardeeUeiParent: input.awardeeUeiParent,
        awardingAgencyKey: input.awardingAgencyKey,
        fundingAgencyKey: input.fundingAgencyKey,
        lastModifiedDate: input.lastModifiedDate,
        naicsCode: input.naicsCode,
        pscCode: input.pscCode,
        searchId: input.searchId,
        parentAwardId: input.parentAwardId,
        vehicleKey: input.vehicleKey,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    }

    let typeLabel =
      input.awardType === 'idv'
        ? 'IDV'
        : input.awardType === 'subcontract'
          ? 'subcontract'
          : 'prime contract';

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
