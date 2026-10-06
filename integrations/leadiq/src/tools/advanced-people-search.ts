import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCompanyFilter, mapContactFilter } from '../lib/filters';
import { spec } from '../spec';

let locationFilterSchema = z
  .object({
    cities: z.array(z.string()).optional().describe('Filter by city names'),
    states: z.array(z.string()).optional().describe('Filter by state/province names'),
    countries: z.array(z.string()).optional().describe('Filter by country names'),
    countryCode2s: z
      .array(z.string())
      .optional()
      .describe('Filter by ISO 2-letter country codes')
  })
  .optional();

let companySizeFilterSchema = z.object({
  min: z.number().optional().describe('Minimum employee count'),
  max: z.number().optional().describe('Maximum employee count')
});

let rangeFilterSchema = z.object({
  min: z.number().optional().describe('Minimum value'),
  max: z.number().optional().describe('Maximum value')
});

let fundingInfoFilterSchema = z.object({
  fundingRoundsMin: z
    .number()
    .optional()
    .describe(
      'Legacy round-count filter; unavailable in the documented current funding input.'
    ),
  fundingRoundsMax: z
    .number()
    .optional()
    .describe(
      'Legacy round-count filter; unavailable in the documented current funding input.'
    ),
  fundingTotalUsdMin: z.number().optional().describe('Minimum total funding in USD'),
  fundingTotalUsdMax: z.number().optional().describe('Maximum total funding in USD'),
  lastFundingTypes: z
    .array(z.string())
    .optional()
    .describe(
      'Legacy funding-type filter; the current provider schema does not document it. Use supported funding ranges instead.'
    ),
  lastFundingRange: rangeFilterSchema
    .optional()
    .describe('Most recent funding amount range in USD'),
  lastFundingDateRange: z
    .object({ start: z.string().optional(), end: z.string().optional() })
    .optional()
    .describe('Most recent funding date range as ISO dates, converted to Unix milliseconds')
});

let contactFilterSchema = z
  .object({
    names: z.array(z.string()).optional().describe('Filter by person names'),
    titles: z
      .array(z.string())
      .optional()
      .describe('Filter by job titles (partial match supported)'),
    seniorities: z
      .array(
        z.enum([
          'VP',
          'Manager',
          'Director',
          'Executive',
          'SeniorIndividualContributor',
          'Other'
        ])
      )
      .optional()
      .describe('Filter by seniority level'),
    roles: z.array(z.string()).optional().describe('Filter by job role/function'),
    locations: locationFilterSchema.describe('Filter by contact location'),
    containsWorkEmails: z
      .array(z.enum(['Verified', 'VerifiedLikely']))
      .optional()
      .describe('Filter by work email verification status'),
    updatedAt: z
      .object({
        start: z.string().optional().describe('Start of date range (ISO format)'),
        end: z.string().optional().describe('End of date range (ISO format)')
      })
      .optional()
      .describe('Filter by last updated date range'),
    newHireFrom: z
      .string()
      .optional()
      .describe('Filter for new hires since this date (ISO format)'),
    newPromotionFrom: z
      .string()
      .optional()
      .describe('Filter for new promotions since this date (ISO format)')
  })
  .optional();

let companyFilterSchema = z
  .object({
    names: z.array(z.string()).optional().describe('Filter by company names'),
    domains: z.array(z.string()).optional().describe('Filter by company domains'),
    industries: z.array(z.string()).optional().describe('Filter by industries'),
    sizes: z
      .array(companySizeFilterSchema)
      .optional()
      .describe('Filter by employee count ranges'),
    locations: locationFilterSchema.describe('Filter by company location'),
    descriptions: z
      .array(z.string())
      .optional()
      .describe(
        'Legacy description filter; not documented in the current CompanyFilter. Use supported filters instead.'
      ),
    technologies: z.array(z.string()).optional().describe('Filter by technologies used'),
    technologyCategories: z
      .array(z.string())
      .optional()
      .describe('Filter by technology categories'),
    revenueRanges: z
      .array(rangeFilterSchema)
      .optional()
      .describe('Filter by revenue ranges (in USD)'),
    fundingInfoFilters: z
      .array(fundingInfoFilterSchema)
      .optional()
      .describe('Filter by funding information'),
    naicsCodeFilters: z.array(z.string()).optional().describe('Filter by NAICS codes'),
    sicCodeFilters: z.array(z.string()).optional().describe('Filter by SIC codes')
  })
  .optional();

let personSchema = z
  .object({
    personId: z.string().optional().describe('LeadIQ person ID'),
    companyId: z.string().optional().describe('Associated company ID'),
    name: z.string().optional().describe('Full name'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    linkedinId: z.string().optional(),
    linkedinUrl: z.string().optional(),
    title: z.string().optional().describe('Current job title'),
    role: z.string().optional().describe('Job role/function'),
    seniority: z.string().optional().describe('Seniority level'),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    workEmails: z.array(z.string()).optional().describe('Work email addresses'),
    verifiedWorkEmails: z.array(z.string()).optional().describe('Verified work emails'),
    verifiedLikelyWorkEmails: z
      .array(z.string())
      .optional()
      .describe('Likely verified work emails'),
    workPhones: z.array(z.string()).optional().describe('Work phone numbers'),
    personalEmails: z.array(z.string()).optional().describe('Personal email addresses'),
    personalPhones: z.array(z.string()).optional().describe('Personal phone numbers'),
    updatedAt: z.string().optional(),
    currentPositionStartDate: z.string().optional(),
    picture: z.string().optional().describe('Profile picture URL'),
    company: z
      .object({
        companyId: z.string().optional(),
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employeeCount: z.number().optional(),
        employeeRange: z.string().optional()
      })
      .passthrough()
      .optional()
      .describe('Associated company')
  })
  .passthrough();

let companyWithPeopleSchema = z
  .object({
    totalContactsInCompany: z
      .number()
      .optional()
      .describe('Total matching contacts at this company'),
    company: z
      .object({
        companyId: z.string().optional(),
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        employeeCount: z.number().optional(),
        employeeRange: z.string().optional()
      })
      .passthrough()
      .optional(),
    people: z
      .array(personSchema)
      .optional()
      .describe('People at this company matching the criteria')
  })
  .passthrough();

export let advancedPeopleSearch = SlateTool.create(spec, {
  name: 'Advanced People Search',
  key: 'advanced_people_search',
  description: `Search for people using broad criteria like job title, seniority, role, company size, industry, location, and technologies.
Supports both **flat** results (list of people) and **grouped** results (people organized by company).
Includes powerful contact and company filters with exclusion support.`,
  instructions: [
    'Use resultFormat "flat" for a simple list of people, or "grouped" for results organized by company.',
    'Combine contactFilter and companyFilter for targeted prospecting.',
    'For deep pagination, pass the returned after cursor unchanged with identical filters and sorting; omit skip. Offset skip + limit cannot exceed 10,000.',
    'Advanced search returns professional profiles and company data, not emails or phones. Use search_contact with a returned personId to request contact information.',
    'Use exclusion filters to omit specific companies or contacts from results.',
    'Sorting options for contacts: RoleAsc, RoleDesc, NameAsc, NameDesc, SeniorityAsc, SeniorityDesc, TitleAsc, TitleDesc, UpdatedAtAsc, UpdatedAtDesc.',
    'Sorting options for companies (grouped mode only): IdDesc, IdAsc, SizeDesc, SizeAsc, NameAsc, NameDesc, IndustryAsc, IndustryDesc.'
  ],
  constraints: [
    'Each search call consumes API credits.',
    'Standard rate limit is 60 requests per minute; selected fields and account-specific API rates determine charges.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resultFormat: z
        .enum(['flat', 'grouped'])
        .default('flat')
        .describe('Return results as a flat list of people or grouped by company'),
      contactFilter: contactFilterSchema.describe('Filters for people'),
      contactExcludedFilter: contactFilterSchema.describe('Exclusion filters for people'),
      companyFilter: companyFilterSchema.describe('Filters for companies'),
      companyExcludedFilter: companyFilterSchema.describe('Exclusion filters for companies'),
      after: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .optional()
        .describe(
          'Opaque cursor returned by the previous page. Keep filters and sorting identical and omit skip.'
        ),
      skip: z.number().optional().describe('Number of results to skip (pagination offset)'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      limitPerCompany: z
        .number()
        .optional()
        .describe('Maximum people per company (grouped mode only)'),
      sortContactsBy: z
        .array(z.string())
        .optional()
        .describe('Sort contacts by field (e.g., RoleAsc, SeniorityDesc, UpdatedAtDesc)'),
      sortCompaniesBy: z
        .array(z.string())
        .optional()
        .describe('Sort companies by field (grouped mode only, e.g., SizeDesc, NameAsc)')
    })
  )
  .output(
    z.object({
      after: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .nullable()
        .optional()
        .describe('Opaque continuation cursor; null means no next page.'),
      totalPeople: z.number().optional().describe('Total matching people (flat mode)'),
      people: z.array(personSchema).optional().describe('Matching people (flat mode)'),
      totalCompanies: z
        .number()
        .optional()
        .describe('Total matching companies (grouped mode)'),
      companies: z
        .array(companyWithPeopleSchema)
        .optional()
        .describe('Companies with matching people (grouped mode)')
    })
  )
  .handleInvocation(async ctx => {
    for (let [name, value] of [
      ['skip', ctx.input.skip],
      ['limit', ctx.input.limit],
      ['limitPerCompany', ctx.input.limitPerCompany]
    ] as const)
      if (
        value !== undefined &&
        (!Number.isSafeInteger(value) ||
          value > 2147483647 ||
          value < (name === 'skip' ? 0 : 1))
      )
        throw createApiServiceError(
          `${name} must be a ${name === 'skip' ? 'non-negative' : 'positive'} safe integer.`,
          { reason: 'invalid_input' }
        );
    if (ctx.input.after?.length === 0)
      throw createApiServiceError(
        'Omit after for the first page; a continuation cursor must be non-empty.',
        { reason: 'invalid_input' }
      );
    if (ctx.input.after && ctx.input.skip !== undefined && ctx.input.skip !== 0)
      throw createApiServiceError(
        'Cursor pagination cannot be combined with a non-zero skip. Keep the filters and sorting unchanged.',
        { reason: 'invalid_input' }
      );
    if (!ctx.input.after && (ctx.input.skip ?? 0) + (ctx.input.limit ?? 0) > 10000)
      throw createApiServiceError(
        'Offset skip + limit cannot exceed 10,000. Use the returned after cursor for deeper pagination.',
        { reason: 'invalid_input' }
      );
    if (
      ctx.input.resultFormat === 'flat' &&
      (ctx.input.limitPerCompany !== undefined || ctx.input.sortCompaniesBy !== undefined)
    )
      throw createApiServiceError(
        'limitPerCompany and sortCompaniesBy apply only to grouped results.',
        { reason: 'invalid_input' }
      );
    let contactSorts = new Set([
      'RoleAsc',
      'NameDesc',
      'SeniorityAsc',
      'IdAsc',
      'NameAsc',
      'TitleAsc',
      'SeniorityDesc',
      'RoleDesc',
      'TitleDesc',
      'IdDesc',
      'MobilePhoneAsc',
      'MobilePhoneDesc',
      'UpdatedAtAsc',
      'UpdatedAtDesc',
      'JobChangeStartedAtAsc',
      'JobChangeStartedAtDesc'
    ]);
    let companySorts = new Set([
      'IdDesc',
      'IdAsc',
      'SizeDesc',
      'NameAsc',
      'SizeAsc',
      'IndustryAsc',
      'NameDesc',
      'IndustryDesc'
    ]);
    if (
      ctx.input.sortContactsBy?.some(value => !contactSorts.has(value)) ||
      ctx.input.sortCompaniesBy?.some(value => !companySorts.has(value))
    )
      throw createApiServiceError('Use a documented contact or company sorting option.', {
        reason: 'invalid_input'
      });
    let client = new Client({ token: ctx.auth.token });
    let input = pickDefined({
      contactFilter: mapContactFilter(ctx.input.contactFilter),
      contactExcludedFilter: mapContactFilter(ctx.input.contactExcludedFilter),
      companyFilter: mapCompanyFilter(ctx.input.companyFilter),
      companyExcludedFilter: mapCompanyFilter(ctx.input.companyExcludedFilter),
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortContactsBy: ctx.input.sortContactsBy
    });
    let mapPerson = (person: any) => ({
      ...person,
      personId: person.id,
      company: person.company ? { ...person.company, companyId: person.company.id } : undefined
    });
    if (ctx.input.resultFormat === 'grouped') {
      let result = await client.groupedAdvancedSearch(
        pickDefined({
          ...input,
          limitPerCompany: ctx.input.limitPerCompany,
          sortCompaniesBy: ctx.input.sortCompaniesBy
        })
      );
      if (!Array.isArray(result?.companies) || typeof result.totalCompanies !== 'number')
        throw createApiServiceError('LeadIQ returned an invalid grouped search page.', {
          reason: 'invalid_api_response'
        });
      let companies = result.companies.map((company: any) => ({
        ...company,
        company: { ...company.company, companyId: company.company.id },
        people: company.people.map(mapPerson)
      }));
      return {
        output: {
          totalCompanies: result.totalCompanies,
          companies,
          after: result.after ?? null
        },
        message: `Returned ${companies.length} company groups; estimated total ${result.totalCompanies}.`
      };
    }
    let result = await client.flatAdvancedSearch(input);
    if (!Array.isArray(result?.people) || typeof result.totalPeople !== 'number')
      throw createApiServiceError('LeadIQ returned an invalid flat search page.', {
        reason: 'invalid_api_response'
      });
    let people = result.people.map(mapPerson);
    return {
      output: { totalPeople: result.totalPeople, people, after: result.after ?? null },
      message: `Returned ${people.length} professional profiles; estimated total ${result.totalPeople}.`
    };
  })
  .build();
