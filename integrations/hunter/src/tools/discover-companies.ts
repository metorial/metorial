import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let discoverCompanies = SlateTool.create(spec, {
  name: 'Discover Companies',
  key: 'discover_companies',
  description: `Discover companies using natural language queries or structured filters. Filter by headquarters location, industry, headcount, company type, and more. Supports AI-assisted natural language search (e.g., "US-based Software companies") that automatically maps to structured filters.`,
  constraints: [
    'Maximum 100 results per request.',
    'Some filters (similar companies, technology, year founded, funding) require a Premium plan.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Natural language search query (e.g., "US-based Software companies"). Automatically maps to structured filters.'
        ),
      industry: z
        .array(z.string())
        .optional()
        .describe('Filter by industry (e.g., ["Software", "Internet"])'),
      companyType: z
        .array(z.string())
        .optional()
        .describe('Filter by company type (e.g., ["private", "public"])'),
      headquartersCountry: z.string().optional().describe('Filter by headquarters country'),
      headquartersState: z.string().optional().describe('Filter by headquarters state'),
      headquartersCity: z.string().optional().describe('Filter by headquarters city'),
      headcountMin: z.number().optional().describe('Minimum employee headcount'),
      headcountMax: z.number().optional().describe('Maximum employee headcount'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results (1-100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of companies matching the query'),
      companies: z
        .array(
          z.object({
            domain: z.string().nullable().describe('Company domain'),
            name: z.string().nullable().describe('Company name'),
            industry: z.string().nullable().describe('Industry'),
            headcount: z.string().nullable().describe('Employee count range'),
            country: z.string().nullable().describe('Headquarters country'),
            city: z.string().nullable().describe('Headquarters city'),
            emailCount: z.number().nullable().describe('Number of email addresses available')
          })
        )
        .describe('List of discovered companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let headquartersLocation: Record<string, any> | undefined;
    if (
      ctx.input.headquartersCountry ||
      ctx.input.headquartersState ||
      ctx.input.headquartersCity
    ) {
      headquartersLocation = {};
      if (ctx.input.headquartersCountry)
        headquartersLocation.country = ctx.input.headquartersCountry;
      if (ctx.input.headquartersState)
        headquartersLocation.state = ctx.input.headquartersState;
      if (ctx.input.headquartersCity) headquartersLocation.city = ctx.input.headquartersCity;
    }

    let headcount: Record<string, any> | undefined;
    if (ctx.input.headcountMin !== undefined || ctx.input.headcountMax !== undefined) {
      headcount = {};
      if (ctx.input.headcountMin !== undefined) headcount.min = ctx.input.headcountMin;
      if (ctx.input.headcountMax !== undefined) headcount.max = ctx.input.headcountMax;
    }

    let result = await client.discoverCompanies({
      query: ctx.input.query,
      headquartersLocation,
      industry: ctx.input.industry,
      headcount,
      companyType: ctx.input.companyType,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let companies = (result.data?.companies || result.data || []).map((c: any) => ({
      domain: c.domain ?? null,
      name: c.name ?? null,
      industry: c.industry ?? null,
      headcount: c.headcount ?? null,
      country: c.country ?? null,
      city: c.city ?? null,
      emailCount: c.email_count ?? null
    }));

    return {
      output: {
        totalCount: result.meta?.total ?? companies.length,
        companies
      },
      message: `Discovered **${companies.length}** companies matching the query.`
    };
  })
  .build();
