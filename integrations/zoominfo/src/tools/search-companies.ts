import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search ZoomInfo's database of companies using firmographic criteria such as name, location, industry, revenue, and employee count. Returns company previews with basic information. **Does not consume credits.** Use the returned company IDs with the Enrich Company tool for detailed profiles.`,
  instructions: [
    'Searches are free and do not consume credits.',
    'Results include basic firmographic data. Use Enrich Company for full details including technographics and hierarchy.'
  ],
  constraints: ['Returns up to 100 companies per page (max 10,000 total results).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyName: z.string().optional().describe('Company name to search for'),
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      country: z.string().optional().describe('Country name or code'),
      state: z.string().optional().describe('State or province'),
      city: z.string().optional().describe('City name'),
      zipCode: z.string().optional().describe('ZIP/postal code'),
      revenueMin: z.number().optional().describe('Minimum annual revenue (in thousands USD)'),
      revenueMax: z.number().optional().describe('Maximum annual revenue (in thousands USD)'),
      employeeRangeMin: z.number().optional().describe('Minimum employee count'),
      employeeRangeMax: z.number().optional().describe('Maximum employee count'),
      industryKeywords: z
        .array(z.string())
        .optional()
        .describe('Industry keywords to filter by'),
      companyType: z
        .string()
        .optional()
        .describe('Company type (e.g., "Public", "Private", "Government")'),
      companyTicker: z.string().optional().describe('Stock ticker symbol'),
      page: z.number().min(1).optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (1-100, default 25)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "name", "-employeeCount", "revenue")')
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of company preview records'),
      totalResults: z.number().optional().describe('Total number of matching companies'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { page, pageSize, sort, ...searchParams } = ctx.input;

    let result = await client.searchCompanies(searchParams, page, pageSize, sort);

    let companies: any[] = [];
    let totalResults: number | undefined;
    let currentPage: number | undefined;
    let totalPages: number | undefined;

    if (ctx.config.apiVersion === 'new') {
      companies = result.data || [];
      totalResults = result.meta?.totalResults;
      currentPage = result.meta?.page?.number;
      totalPages = result.meta?.page?.total;
    } else {
      companies = result.data || result.result || [];
      totalResults = result.totalResults;
      currentPage = result.currentPage;
      totalPages = result.totalPages;
    }

    return {
      output: { companies, totalResults, currentPage, totalPages },
      message: `Found **${totalResults ?? companies.length}** companies${currentPage ? ` (page ${currentPage}${totalPages ? ` of ${totalPages}` : ''})` : ''}.`
    };
  })
  .build();
