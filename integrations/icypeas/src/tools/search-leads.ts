import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let includeExcludeSchema = z
  .object({
    include: z.array(z.string()).optional().describe('Values to include'),
    exclude: z.array(z.string()).optional().describe('Values to exclude')
  })
  .optional();

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search the Icypeas lead database for people matching specific criteria. Filter by job title, company, location, skills, and more. Results are paginated. Use the **countOnly** flag to preview result volumes without consuming credits.`,
  instructions: [
    'Each filter supports include/exclude arrays with up to 200 values each.',
    'Location supports city names, country names, or alpha-2 country codes.',
    'The count query is free of charge.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      countOnly: z
        .boolean()
        .optional()
        .describe('If true, only count matching results without retrieving data (free)'),
      currentJobTitle: includeExcludeSchema.describe('Filter by current job title'),
      pastJobTitle: includeExcludeSchema.describe('Filter by past job title'),
      currentCompanyName: includeExcludeSchema.describe('Filter by current company name'),
      pastCompanyName: includeExcludeSchema.describe('Filter by past company name'),
      currentCompanyWebsite: includeExcludeSchema.describe(
        'Filter by current company website/domain'
      ),
      pastCompanyWebsite: includeExcludeSchema.describe(
        'Filter by past company website/domain'
      ),
      location: includeExcludeSchema.describe(
        'Filter by location (city, country name, or alpha-2 code)'
      ),
      school: includeExcludeSchema.describe('Filter by school/university'),
      languages: includeExcludeSchema.describe('Filter by languages'),
      skills: includeExcludeSchema.describe('Filter by skills'),
      keyword: includeExcludeSchema.describe('Full-text keyword search'),
      firstname: includeExcludeSchema.describe('Filter by first name'),
      lastname: includeExcludeSchema.describe('Filter by last name'),
      paginationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response'),
      pageSize: z.number().optional().describe('Results per page (1-200, default: 100)')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of matching leads'),
      leads: z.array(z.any()).optional().describe('Array of lead profiles'),
      paginationToken: z.string().optional().describe('Token for fetching the next page'),
      raw: z.any().optional().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let query: Record<string, any> = {};
    let filterFields = [
      'currentJobTitle',
      'pastJobTitle',
      'currentCompanyName',
      'pastCompanyName',
      'currentCompanyWebsite',
      'pastCompanyWebsite',
      'location',
      'school',
      'languages',
      'skills',
      'keyword',
      'firstname',
      'lastname'
    ] as const;

    for (let field of filterFields) {
      let value = ctx.input[field];
      if (value && (value.include?.length || value.exclude?.length)) {
        query[field] = value;
      }
    }

    if (ctx.input.countOnly) {
      let result = await client.countPeople(query);
      return {
        output: {
          total: result?.total ?? result?.count,
          raw: result
        },
        message: `Found **${result?.total ?? result?.count ?? 'unknown'}** matching leads.`
      };
    }

    let pagination: { token?: string; size?: number } | undefined;
    if (ctx.input.paginationToken || ctx.input.pageSize) {
      pagination = {};
      if (ctx.input.paginationToken) pagination.token = ctx.input.paginationToken;
      if (ctx.input.pageSize) pagination.size = ctx.input.pageSize;
    }

    let result = await client.findPeople({ query, pagination });
    let leads = result?.leads || [];

    return {
      output: {
        total: result?.total,
        leads,
        paginationToken: result?.pagination?.token,
        raw: result
      },
      message: `Retrieved **${leads.length}** leads.${result?.total ? ` Total matches: ${result.total}` : ''}`
    };
  })
  .build();
