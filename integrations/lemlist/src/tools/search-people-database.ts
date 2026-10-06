import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalBoolean,
  optionalNumber,
  optionalText,
  rows,
  text
} from '../lib/client';
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
    'Use Get Database Filters to discover current filter IDs and accepted values. Include and exclude values are sent as the provider in and out arrays.',
    'Use "search" for free text queries.',
    'Results are paginated - use page and size to navigate.'
  ],
  constraints: [
    'Maximum page size is 100 for people search.',
    "Searching uses the plan's query allowance over a 24-hour window. Enrichment is a separate credit-consuming operation."
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
      size: z.number().optional().describe('Results per page (1 to 100)')
    })
  )
  .output(
    z.object({
      total: z.number().optional(),
      page: z.number().optional(),
      size: z.number().optional(),
      remainingQueries: z
        .number()
        .optional()
        .describe(
          'Provider-reported remaining database search calls in the current allowance window.'
        ),
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
          currentCompanySize: z.string().optional(),
          experiences: z
            .array(
              z.object({
                title: z.string().optional(),
                companyName: z.string().optional(),
                companyDomain: z.string().optional(),
                companyIndustry: z.string().optional(),
                companySize: z.string().optional(),
                mainInProfile: z.boolean().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional()
              })
            )
            .optional()
            .describe(
              'Provider work history. Omitted current-job fields are not inferred from unlabelled historical experiences.'
            )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const data = await client.searchPeople({
      filters: ctx.input.filters?.map(filter => ({
        filterId: filter.filterId,
        in: filter.include,
        out: filter.exclude
      })),
      search: ctx.input.search,
      page: ctx.input.page,
      size: ctx.input.size
    });
    const results = rows(data.results).map(p => {
      const id =
        p.lead_id == null
          ? optionalText(p._id)
          : typeof p.lead_id === 'number' && Number.isSafeInteger(p.lead_id)
            ? String(p.lead_id)
            : text(p.lead_id, 'person identifier');
      return {
        personId: id,
        fullName: optionalText(p.full_name),
        firstName: optionalText(p.first_name),
        lastName: optionalText(p.last_name),
        country: optionalText(p.country),
        linkedinUrl: optionalText(p.lead_linkedin_url ?? p.linkedin_url),
        currentJobTitle: optionalText(p.current_job_title),
        currentCompanyName: optionalText(p.current_exp_company_name ?? p.current_company_name),
        currentCompanyDomain: optionalText(p.current_company_domain),
        currentCompanyIndustry: optionalText(p.current_company_industry),
        currentCompanySize: optionalText(p.current_company_size),
        experiences:
          p.experiences == null
            ? undefined
            : rows(p.experiences).map(e => ({
                title: optionalText(e.title),
                companyName: optionalText(e.company_name),
                companyDomain: optionalText(e.company_domain),
                companyIndustry: optionalText(e.company_industry),
                companySize: optionalText(e.company_size),
                mainInProfile: optionalBoolean(e.main_in_profile),
                startDate: optionalText(e.date_from),
                endDate: optionalText(e.date_to)
              }))
      };
    });
    return {
      output: {
        total: optionalNumber(data.total),
        page: optionalNumber(data.page),
        size: optionalNumber(data.size),
        remainingQueries: optionalNumber(data.limitation),
        results
      },
      message: `Retrieved **${results.length}** people in the requested page; plan query limits apply.`
    };
  })
  .build();
