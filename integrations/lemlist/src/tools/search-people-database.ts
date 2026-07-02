import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  filterId: z
    .string()
    .describe(
      'Filter identifier (e.g., country, currentCompanyTechnologies, jobTitle, industry)'
    ),
  include: z.array(z.string()).optional().describe('Values to include in the filter'),
  exclude: z.array(z.string()).optional().describe('Values to exclude from the filter')
});

export let searchPeopleDatabase = SlateTool.create(spec, {
  name: 'Search People Database',
  key: 'search_people_database',
  description: `Search the Lemlist people database to find prospects by criteria such as job title, company, location, industry, and technologies. Returns matching people with their professional details. Useful for building targeted lead lists.`,
  instructions: [
    'Use filters to narrow results. Common filter IDs: country, jobTitle, currentCompanyTechnologies, industry, companySize, seniority.',
    'Use "search" for free text queries.',
    'Results are paginated - use page and size to navigate.'
  ],
  constraints: [
    'Maximum page size is 25 for people search.',
    'Searching consumes credits depending on your plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.array(filterSchema).optional().describe('Array of search filters'),
      search: z.string().optional().describe('Free text search query'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Results per page (max 25)')
    })
  )
  .output(
    z.object({
      total: z.number().optional(),
      page: z.number().optional(),
      size: z.number().optional(),
      results: z.array(
        z.object({
          personId: z.string().optional(),
          fullName: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          country: z.string().optional(),
          linkedinUrl: z.string().optional(),
          currentJobTitle: z.string().optional(),
          currentCompanyName: z.string().optional(),
          currentCompanyDomain: z.string().optional(),
          currentCompanyIndustry: z.string().optional(),
          currentCompanySize: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let apiFilters = ctx.input.filters?.map(f => ({
      filterId: f.filterId,
      in: f.include,
      out: f.exclude
    }));

    let data = await client.searchPeople({
      filters: apiFilters,
      search: ctx.input.search,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let results = (data.results ?? []).map((p: any) => ({
      personId: p.lead_id,
      fullName: p.full_name,
      firstName: p.first_name,
      lastName: p.last_name,
      country: p.country,
      linkedinUrl: p.linkedin_url,
      currentJobTitle: p.current_job_title,
      currentCompanyName: p.current_company_name,
      currentCompanyDomain: p.current_company_domain,
      currentCompanyIndustry: p.current_company_industry,
      currentCompanySize: p.current_company_size
    }));

    return {
      output: {
        total: data.total,
        page: data.page,
        size: data.size,
        results
      },
      message: `Found **${data.total ?? results.length}** people matching your search. Showing page ${data.page ?? 1} with ${results.length} result(s).`
    };
  })
  .build();
