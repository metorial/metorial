import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search Apollo's database of 275M+ contacts to find prospects based on demographic filters. Returns people with their professional details and organization info.
**Does not return email addresses or phone numbers** — use the Enrich Person tool for that.`,
  instructions: [
    'Use specific filters to narrow results. Broad searches may hit the 50,000 record display limit.',
    'Employee count ranges use formats like "1,10", "11,50", "51,200", "201,500", "501,1000", "1001,5000", "5001,10000".'
  ],
  constraints: [
    'Maximum 50,000 results (100 per page, up to 500 pages)',
    'Does not return email addresses or phone numbers'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().optional().describe('Keywords to search for across person records'),
      jobTitles: z
        .array(z.string())
        .optional()
        .describe('Filter by job titles, e.g. ["CEO", "VP of Sales"]'),
      locations: z
        .array(z.string())
        .optional()
        .describe('Filter by person locations, e.g. ["San Francisco, CA", "New York"]'),
      seniorities: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by seniority levels, e.g. ["senior", "manager", "director", "vp", "c_suite"]'
        ),
      companyDomains: z
        .array(z.string())
        .optional()
        .describe('Filter by company domains, e.g. ["apollo.io", "google.com"]'),
      companyLocations: z.array(z.string()).optional().describe('Filter by company locations'),
      companyEmployeeRanges: z
        .array(z.string())
        .optional()
        .describe('Filter by company size ranges, e.g. ["1,10", "51,200", "1001,5000"]'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      people: z.array(
        z.object({
          personId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          name: z.string().optional(),
          title: z.string().optional(),
          headline: z.string().optional(),
          linkedinUrl: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          seniority: z.string().optional(),
          departments: z.array(z.string()).optional(),
          organizationName: z.string().optional(),
          organizationId: z.string().optional()
        })
      ),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchPeople({
      qKeywords: ctx.input.keywords,
      personTitles: ctx.input.jobTitles,
      personLocations: ctx.input.locations,
      personSeniorities: ctx.input.seniorities,
      organizationDomains: ctx.input.companyDomains,
      organizationLocations: ctx.input.companyLocations,
      organizationNumEmployeesRanges: ctx.input.companyEmployeeRanges,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let people = result.people.map(p => ({
      personId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      name: p.name,
      title: p.title,
      headline: p.headline,
      linkedinUrl: p.linkedin_url,
      city: p.city,
      state: p.state,
      country: p.country,
      seniority: p.seniority,
      departments: p.departments,
      organizationName: p.organization?.name,
      organizationId: p.organization_id
    }));

    return {
      output: {
        people,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? people.length}** people (page ${result.pagination?.page ?? 1} of ${result.pagination?.total_pages ?? 1}). Returned ${people.length} results.`
    };
  })
  .build();
