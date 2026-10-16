import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type PaginatedResponse } from '../lib/client';
import { spec } from '../spec';

export let searchAwardees = SlateTool.create(spec, {
  name: 'Search Awardees',
  key: 'search_awardees',
  description: `Search 1.5M+ government contractor and grant recipient profiles registered in SAM and DSBS. Look up awardees by UEI, CAGE code, parent company, or NAICS code. Returns company details including legal names, addresses, business type classifications, NAICS/PSC codes, and subsidiary relationships. Also supports querying mentor-protege and teaming partnership relationships between awardees.`,
  instructions: [
    'Use uei to look up a specific entity by its Unique Entity Identifier.',
    'Use cageCode to look up by Commercial And Government Entity code.',
    'Set lookupType to "mentor_protege" or "partnership" to explore awardee relationships.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z
        .enum(['awardee', 'mentor_protege', 'partnership'])
        .default('awardee')
        .describe('Type of awardee data to search'),
      // Awardee filters
      uei: z
        .string()
        .optional()
        .describe('Unique Entity Identifier (UEI) to look up a specific awardee'),
      cageCode: z.string().optional().describe('CAGE code to look up a specific awardee'),
      awardeeKeyParent: z
        .number()
        .optional()
        .describe(
          'HigherGov parent-level awardee key; finds subsidiaries for awardee lookups, or filters mentor/prime parents for relationship lookups'
        ),
      primaryNaics: z.string().optional().describe('Primary NAICS code to filter by industry'),
      registrationLastUpdateDate: z
        .string()
        .optional()
        .describe('Filter to registrations updated on or after this date (YYYY-MM-DD)'),
      // Mentor-protege filters
      awardeeKeyMentor: z
        .number()
        .optional()
        .describe('HigherGov awardee key for mentor (mentor_protege only)'),
      awardeeKeyProtege: z
        .number()
        .optional()
        .describe('HigherGov awardee key for protege (mentor_protege only)'),
      awardeeKeyMentorParent: z
        .number()
        .optional()
        .describe(
          'HigherGov parent mentor awardee key (mentor_protege only); must agree with awardeeKeyParent when both are provided'
        ),
      awardeeKeyProtegeParent: z
        .number()
        .optional()
        .describe('HigherGov parent protege awardee key (mentor_protege only)'),
      // Partnership filters
      awardeeKeyPrime: z
        .number()
        .optional()
        .describe('HigherGov awardee key for prime contractor (partnership only)'),
      awardeeKeySub: z
        .number()
        .optional()
        .describe('HigherGov awardee key for subcontractor (partnership only)'),
      awardeeKeyPrimeParent: z
        .number()
        .optional()
        .describe(
          'HigherGov parent prime awardee key (partnership only); must agree with awardeeKeyParent when both are provided'
        ),
      awardeeKeySubParent: z
        .number()
        .optional()
        .describe('HigherGov parent subcontractor awardee key (partnership only)'),
      ordering: z
        .string()
        .optional()
        .describe('Sort order for awardee lookups; omit for relationship lookups'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      awardees: z.array(z.record(z.string(), z.unknown())).describe('List of awardee records'),
      totalCount: z.number().describe('Total number of matching records'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let branchFilters = {
      awardee: ['uei', 'cageCode', 'primaryNaics', 'registrationLastUpdateDate', 'ordering'],
      mentor_protege: [
        'awardeeKeyMentor',
        'awardeeKeyMentorParent',
        'awardeeKeyProtege',
        'awardeeKeyProtegeParent'
      ],
      partnership: [
        'awardeeKeyPrime',
        'awardeeKeyPrimeParent',
        'awardeeKeySub',
        'awardeeKeySubParent'
      ]
    } as const;
    for (let [branch, fields] of Object.entries(branchFilters)) {
      if (branch === input.lookupType) continue;
      for (let field of fields) {
        if (input[field] !== undefined)
          throw createApiServiceError(
            `${field} is supported only for ${branch} lookups. Choose that lookupType or omit this filter.`
          );
      }
    }
    if (
      input.lookupType === 'mentor_protege' &&
      input.awardeeKeyParent !== undefined &&
      input.awardeeKeyMentorParent !== undefined &&
      input.awardeeKeyParent !== input.awardeeKeyMentorParent
    ) {
      throw createApiServiceError(
        'awardeeKeyParent and awardeeKeyMentorParent must agree when both are provided.'
      );
    }
    if (
      input.lookupType === 'partnership' &&
      input.awardeeKeyParent !== undefined &&
      input.awardeeKeyPrimeParent !== undefined &&
      input.awardeeKeyParent !== input.awardeeKeyPrimeParent
    ) {
      throw createApiServiceError(
        'awardeeKeyParent and awardeeKeyPrimeParent must agree when both are provided.'
      );
    }

    let response: PaginatedResponse<Record<string, unknown>>;
    if (input.lookupType === 'mentor_protege') {
      response = await client.getAwardeeMentorProtege({
        awardeeKeyMentor: input.awardeeKeyMentor,
        awardeeKeyMentorParent: input.awardeeKeyMentorParent ?? input.awardeeKeyParent,
        awardeeKeyProtege: input.awardeeKeyProtege,
        awardeeKeyProtegeParent: input.awardeeKeyProtegeParent,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else if (input.lookupType === 'partnership') {
      response = await client.getAwardeePartnerships({
        awardeeKeyPrime: input.awardeeKeyPrime,
        awardeeKeyPrimeParent: input.awardeeKeyPrimeParent ?? input.awardeeKeyParent,
        awardeeKeySub: input.awardeeKeySub,
        awardeeKeySubParent: input.awardeeKeySubParent,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else {
      response = await client.getAwardees({
        uei: input.uei,
        cageCode: input.cageCode,
        awardeeKeyParent: input.awardeeKeyParent,
        primaryNaics: input.primaryNaics,
        registrationLastUpdateDate: input.registrationLastUpdateDate,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    }

    return {
      output: {
        awardees: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** ${input.lookupType} records (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();
