import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  fundingRoundsMin: z.number().optional().describe('Minimum number of funding rounds'),
  fundingRoundsMax: z.number().optional().describe('Maximum number of funding rounds'),
  fundingTotalUsdMin: z.number().optional().describe('Minimum total funding in USD'),
  fundingTotalUsdMax: z.number().optional().describe('Maximum total funding in USD'),
  lastFundingTypes: z.array(z.string()).optional().describe('Filter by last funding type')
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
      .describe('Filter by keywords in company description'),
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
    'Use exclusion filters to omit specific companies or contacts from results.',
    'Sorting options for contacts: RoleAsc, RoleDesc, NameAsc, NameDesc, SeniorityAsc, SeniorityDesc, TitleAsc, TitleDesc, UpdatedAtAsc, UpdatedAtDesc.',
    'Sorting options for companies (grouped mode only): IdDesc, IdAsc, SizeDesc, SizeAsc, NameAsc, NameDesc, IndustryAsc, IndustryDesc.'
  ],
  constraints: [
    'Each search call consumes API credits.',
    'Rate limits: 10 requests/minute (free), 60 requests/minute (paid).'
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
    let client = new Client({ token: ctx.auth.token });

    let mapPerson = (p: any) => ({
      ...p,
      personId: p.id,
      company: p.company ? { ...p.company, companyId: p.company.id } : undefined
    });

    if (ctx.input.resultFormat === 'grouped') {
      let input: Record<string, any> = {};
      if (ctx.input.contactFilter) input.contactFilter = ctx.input.contactFilter;
      if (ctx.input.contactExcludedFilter)
        input.contactExcludedFilter = ctx.input.contactExcludedFilter;
      if (ctx.input.companyFilter) input.companyFilter = ctx.input.companyFilter;
      if (ctx.input.companyExcludedFilter)
        input.companyExcludedFilter = ctx.input.companyExcludedFilter;
      if (ctx.input.skip !== undefined) input.skip = ctx.input.skip;
      if (ctx.input.limit !== undefined) input.limit = ctx.input.limit;
      if (ctx.input.limitPerCompany !== undefined)
        input.limitPerCompany = ctx.input.limitPerCompany;
      if (ctx.input.sortContactsBy) input.sortContactsBy = ctx.input.sortContactsBy;
      if (ctx.input.sortCompaniesBy) input.sortCompaniesBy = ctx.input.sortCompaniesBy;

      let result = await client.groupedAdvancedSearch(input);

      let companies = (result.companies ?? []).map((c: any) => ({
        totalContactsInCompany: c.totalContactsInCompany,
        company: c.company ? { ...c.company, companyId: c.company.id } : undefined,
        people: (c.people ?? []).map(mapPerson)
      }));

      return {
        output: {
          totalCompanies: result.totalCompanies ?? 0,
          companies
        },
        message: `Found people across **${result.totalCompanies ?? 0}** companies.`
      };
    } else {
      let input: Record<string, any> = {};
      if (ctx.input.contactFilter) input.contactFilter = ctx.input.contactFilter;
      if (ctx.input.contactExcludedFilter)
        input.contactExcludedFilter = ctx.input.contactExcludedFilter;
      if (ctx.input.companyFilter) input.companyFilter = ctx.input.companyFilter;
      if (ctx.input.companyExcludedFilter)
        input.companyExcludedFilter = ctx.input.companyExcludedFilter;
      if (ctx.input.skip !== undefined) input.skip = ctx.input.skip;
      if (ctx.input.limit !== undefined) input.limit = ctx.input.limit;
      if (ctx.input.sortContactsBy) input.sortContactsBy = ctx.input.sortContactsBy;

      let result = await client.flatAdvancedSearch(input);

      let people = (result.people ?? []).map(mapPerson);

      return {
        output: {
          totalPeople: result.totalPeople ?? 0,
          people
        },
        message: `Found **${result.totalPeople ?? 0}** matching people.`
      };
    }
  })
  .build();
