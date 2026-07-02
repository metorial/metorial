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

let rangeSchema = z.string().optional().describe('Range comparison (e.g. ">100", "<=500")');

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search the Icypeas lead database for companies matching specific criteria. Filter by name, industry, location, headcount, domain, and more. Results are paginated. Use **countOnly** to preview result volumes without charges.`,
  instructions: [
    'Location supports country names or alpha-2 codes.',
    'Headcount uses range operators (e.g. ">100", "<=500").',
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
        .describe('If true, only count matching results (free)'),
      name: includeExcludeSchema.describe('Filter by company name'),
      industry: includeExcludeSchema.describe('Filter by industry'),
      location: includeExcludeSchema.describe('Filter by location'),
      type: includeExcludeSchema.describe(
        'Filter by company type (e.g. Privately Held, Public Company)'
      ),
      domain: includeExcludeSchema.describe('Filter by website domain'),
      keyword: includeExcludeSchema.describe('Full-text keyword search'),
      headcount: rangeSchema.describe('Filter by employee count range'),
      paginationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response'),
      pageSize: z.number().optional().describe('Results per page (1-200, default: 100)')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of matching companies'),
      companies: z.array(z.any()).optional().describe('Array of company profiles'),
      paginationToken: z.string().optional().describe('Token for fetching the next page'),
      raw: z.any().optional().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let query: Record<string, any> = {};
    let filterFields = ['name', 'industry', 'location', 'type', 'domain', 'keyword'] as const;

    for (let field of filterFields) {
      let value = ctx.input[field];
      if (value && (value.include?.length || value.exclude?.length)) {
        query[field] = value;
      }
    }

    if (ctx.input.headcount) {
      query.headcount = ctx.input.headcount;
    }

    if (ctx.input.countOnly) {
      let result = await client.countCompanies(query);
      return {
        output: {
          total: result?.total ?? result?.count,
          raw: result
        },
        message: `Found **${result?.total ?? result?.count ?? 'unknown'}** matching companies.`
      };
    }

    let pagination: { token?: string; size?: number } | undefined;
    if (ctx.input.paginationToken || ctx.input.pageSize) {
      pagination = {};
      if (ctx.input.paginationToken) pagination.token = ctx.input.paginationToken;
      if (ctx.input.pageSize) pagination.size = ctx.input.pageSize;
    }

    let result = await client.findCompanies({ query, pagination });
    let companies = result?.companies || result?.leads || [];

    return {
      output: {
        total: result?.total,
        companies,
        paginationToken: result?.pagination?.token,
        raw: result
      },
      message: `Retrieved **${companies.length}** companies.${result?.total ? ` Total matches: ${result.total}` : ''}`
    };
  })
  .build();
