import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  value: z.string().describe('Filter value'),
  exclude: z
    .boolean()
    .optional()
    .describe('If true, excludes matches instead of including them'),
  exactMatch: z.boolean().optional().describe('If true, requires exact match instead of fuzzy')
});

let rangeFilterSchema = z.object({
  min: z.number().optional().describe('Minimum value (inclusive)'),
  max: z.number().optional().describe('Maximum value (inclusive)'),
  exclude: z.boolean().optional().describe('If true, excludes this range')
});

let employmentSchema = z.object({
  title: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  companyId: z.string().optional(),
  companyIndustry: z.string().optional(),
  companyHeadcount: z.number().optional(),
  companyType: z.string().optional(),
  isCurrent: z.boolean().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional()
});

let personSchema = z.object({
  personId: z.string().optional(),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  location: z
    .object({
      country: z.string().optional(),
      countryCode: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional()
    })
    .optional(),
  linkedinUrl: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z
    .array(
      z.object({
        language: z.string().optional(),
        code: z.string().optional(),
        proficiency: z.string().optional()
      })
    )
    .optional(),
  educations: z
    .array(
      z.object({
        schoolName: z.string().optional(),
        degree: z.string().optional(),
        startAt: z.string().optional(),
        endAt: z.string().optional()
      })
    )
    .optional(),
  currentEmployment: employmentSchema.optional(),
  allEmployment: z.array(employmentSchema).optional()
});

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search for business contacts using filters such as job title, seniority, location, company, industry, skills, and more. Returns professional details including work history, location, and education. Results are returned immediately (synchronous).

Does **not** return emails or phone numbers — use **Enrich Contacts** to get contact details for found people.

Costs 0.25 credits per person returned.`,
  instructions: [
    'All filters are combined with AND logic.',
    'Use searchAfter cursor for pagination beyond 10,000 results.'
  ],
  constraints: [
    'Maximum 100 results per page.',
    'Offset-based pagination limited to 10,000 results; use searchAfter for deeper pagination.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of results to skip (max 10,000)'),
      limit: z.number().optional().describe('Results per page (default 10, max 100)'),
      searchAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination beyond 10,000 results'),
      personNames: z.array(filterSchema).optional().describe('Filter by person name'),
      personLinkedinUrls: z.array(filterSchema).optional().describe('Filter by LinkedIn URL'),
      personLocations: z.array(filterSchema).optional().describe('Filter by person location'),
      personSkills: z.array(filterSchema).optional().describe('Filter by skills'),
      personUniversities: z.array(filterSchema).optional().describe('Filter by university'),
      personIds: z.array(filterSchema).optional().describe('Filter by person ID'),
      currentCompanyNames: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company name'),
      currentCompanyDomains: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company domain'),
      currentCompanyLinkedinUrls: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company LinkedIn URL'),
      currentCompanySpecialties: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company specialty'),
      currentCompanyIndustries: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company industry'),
      currentCompanyTypes: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company type'),
      currentCompanyHeadquarters: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company HQ location'),
      currentCompanyIds: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current company ID'),
      currentCompanyHeadcounts: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by current company employee count range'),
      currentCompanyFoundedYears: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by current company founding year range'),
      currentCompanyYearsAt: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by years at current company'),
      currentCompanyDaysSinceLastJobChange: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by days since last job change'),
      pastCompanyNames: z
        .array(filterSchema)
        .optional()
        .describe('Filter by past company name'),
      pastCompanyDomains: z
        .array(filterSchema)
        .optional()
        .describe('Filter by past company domain'),
      currentPositionSeniorityLevel: z
        .array(filterSchema)
        .optional()
        .describe('Filter by seniority (e.g. Director, VP, C-Suite)'),
      currentPositionTitles: z
        .array(filterSchema)
        .optional()
        .describe('Filter by current job title'),
      pastPositionTitles: z
        .array(filterSchema)
        .optional()
        .describe('Filter by past job title'),
      currentPositionYearsIn: z
        .array(rangeFilterSchema)
        .optional()
        .describe('Filter by years in current position')
    })
  )
  .output(
    z.object({
      people: z.array(personSchema).describe('Matching people'),
      total: z.number().describe('Total number of matching results'),
      creditsUsed: z.number().optional().describe('Credits consumed'),
      offset: z.number().optional().describe('Current offset'),
      searchAfter: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let toApiFilter = (
      filters?: Array<{ value: string; exclude?: boolean; exactMatch?: boolean }>
    ) => {
      if (!filters) return undefined;
      return filters.map(f => ({
        value: f.value,
        exclude: f.exclude,
        exact_match: f.exactMatch
      }));
    };

    let result = await client.searchPeople({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      search_after: ctx.input.searchAfter,
      person_names: toApiFilter(ctx.input.personNames),
      person_linkedin_urls: toApiFilter(ctx.input.personLinkedinUrls),
      person_locations: toApiFilter(ctx.input.personLocations),
      person_skills: toApiFilter(ctx.input.personSkills),
      person_universities: toApiFilter(ctx.input.personUniversities),
      person_ids: toApiFilter(ctx.input.personIds),
      current_company_names: toApiFilter(ctx.input.currentCompanyNames),
      current_company_domains: toApiFilter(ctx.input.currentCompanyDomains),
      current_company_linkedin_urls: toApiFilter(ctx.input.currentCompanyLinkedinUrls),
      current_company_specialties: toApiFilter(ctx.input.currentCompanySpecialties),
      current_company_industries: toApiFilter(ctx.input.currentCompanyIndustries),
      current_company_types: toApiFilter(ctx.input.currentCompanyTypes),
      current_company_headquarters: toApiFilter(ctx.input.currentCompanyHeadquarters),
      current_company_ids: toApiFilter(ctx.input.currentCompanyIds),
      current_company_headcounts: ctx.input.currentCompanyHeadcounts,
      current_company_founded_years: ctx.input.currentCompanyFoundedYears,
      current_company_years_at: ctx.input.currentCompanyYearsAt,
      current_company_days_since_last_job_change:
        ctx.input.currentCompanyDaysSinceLastJobChange,
      past_company_names: toApiFilter(ctx.input.pastCompanyNames),
      past_company_domains: toApiFilter(ctx.input.pastCompanyDomains),
      current_position_seniority_level: toApiFilter(ctx.input.currentPositionSeniorityLevel),
      current_position_titles: toApiFilter(ctx.input.currentPositionTitles),
      past_position_titles: toApiFilter(ctx.input.pastPositionTitles),
      current_position_years_in: ctx.input.currentPositionYearsIn
    });

    let mapEmployment = (emp: any) => {
      if (!emp) return undefined;
      return {
        title: emp.title,
        companyName: emp.company?.name,
        companyDomain: emp.company?.domain,
        companyId: emp.company?.id,
        companyIndustry: emp.company?.industry?.main_industry,
        companyHeadcount: emp.company?.headcount,
        companyType: emp.company?.company_type,
        isCurrent: emp.is_current,
        startAt: emp.start_at,
        endAt: emp.end_at
      };
    };

    let people = (result.people ?? []).map((person: any) => ({
      personId: person.id,
      fullName: person.full_name,
      firstName: person.first_name,
      lastName: person.last_name,
      location: person.location
        ? {
            country: person.location.country,
            countryCode: person.location.country_code,
            city: person.location.city,
            region: person.location.region
          }
        : undefined,
      linkedinUrl: person.social_profiles?.linkedin?.url,
      skills: person.skills,
      languages: person.languages?.map((l: any) => ({
        language: l.language,
        code: l.code,
        proficiency: l.proficiency
      })),
      educations: person.educations?.map((e: any) => ({
        schoolName: e.school_name,
        degree: e.degree,
        startAt: e.start_at,
        endAt: e.end_at
      })),
      currentEmployment: person.employment?.current
        ? mapEmployment(person.employment.current)
        : undefined,
      allEmployment: person.employment?.all?.map(mapEmployment)
    }));

    return {
      output: {
        people,
        total: result.metadata?.total ?? 0,
        creditsUsed: result.metadata?.credits,
        offset: result.metadata?.offset,
        searchAfter: result.metadata?.search_after
      },
      message: `Found **${result.metadata?.total ?? 0}** matching people. Returned ${people.length} result(s). Credits used: ${result.metadata?.credits ?? 0}.`
    };
  })
  .build();
