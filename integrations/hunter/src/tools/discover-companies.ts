import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalNumber, optionalRow, optionalText, rows } from '../lib/client';
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
      organizationDomains: z
        .array(z.string())
        .optional()
        .describe(
          'Exact company domains to include, passed to the documented organization filter.'
        ),
      companyType: z
        .array(z.string())
        .optional()
        .describe('Filter by company type (e.g., ["private", "public"])'),
      headquartersCountry: z.string().optional().describe('Filter by headquarters country'),
      headquartersState: z.string().optional().describe('Filter by headquarters state'),
      headquartersCity: z.string().optional().describe('Filter by headquarters city'),
      headcountMin: z
        .number()
        .optional()
        .describe(
          'Minimum employee headcount; must align with Hunter bucket starts: 0,1,11,51,201,501,1001,5001,10001'
        ),
      headcountMax: z
        .number()
        .optional()
        .describe(
          'Maximum employee headcount; must align with bucket ends: 10,50,200,500,1000,5000,10000'
        ),
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
      totalCount: z.number().optional().describe('Provider-reported total matching companies'),
      returnedCount: z.number().describe('Companies returned in this page'),
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
    const { headcountMin: min, headcountMax: max } = ctx.input;
    const ranges: [number, number, string][] = [
      [1, 10, '1-10'],
      [11, 50, '11-50'],
      [51, 200, '51-200'],
      [201, 500, '201-500'],
      [501, 1000, '501-1000'],
      [1001, 5000, '1001-5000'],
      [5001, 10000, '5001-10000'],
      [10001, Number.POSITIVE_INFINITY, '10001+']
    ];
    if (
      (min !== undefined && ![0, ...ranges.map(r => r[0])].includes(min)) ||
      (max !== undefined && !ranges.map(r => r[1]).includes(max)) ||
      (min !== undefined && max !== undefined && min > max)
    )
      throw createApiServiceError(
        'Hunter supports headcount buckets. Minimum must be 0, 1, 11, 51, 201, 501, 1001, 5001 or 10001; maximum must be 10, 50, 200, 500, 1000, 5000 or 10000. Omit an upper bound for 10001+. Arbitrary partial buckets cannot be filtered accurately.'
      );
    const headcount =
      min === undefined && max === undefined
        ? undefined
        : ranges
            .filter(r => r[0] >= (min ?? 0) && r[1] <= (max ?? Number.POSITIVE_INFINITY))
            .map(r => r[2]);
    const location =
      ctx.input.headquartersCountry ||
      ctx.input.headquartersState ||
      ctx.input.headquartersCity
        ? {
            country: ctx.input.headquartersCountry,
            state: ctx.input.headquartersState,
            city: ctx.input.headquartersCity
          }
        : undefined;
    if (location && (location.city || location.state) && !location.country)
      throw createApiServiceError(
        'Provide headquartersCountry when filtering by city or state.'
      );
    if (location?.country?.toUpperCase() === 'US' && location.city && !location.state)
      throw createApiServiceError('Provide headquartersState when filtering by a US city.');
    const result = await new Client({ token: ctx.auth.token }).discoverCompanies({
      query: ctx.input.query,
      organization: ctx.input.organizationDomains
        ? { domain: ctx.input.organizationDomains }
        : undefined,
      headquartersLocation: location
        ? {
            include: [
              Object.fromEntries(
                Object.entries(location).filter(([, value]) => value !== undefined)
              )
            ]
          }
        : undefined,
      industry: ctx.input.industry,
      headcount,
      companyType: ctx.input.companyType?.map(value =>
        value === 'private' ? 'privately held' : value === 'public' ? 'public company' : value
      ),
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    const companies = rows(result.data).map(c => ({
      domain: optionalText(c.domain) ?? null,
      name: optionalText(c.organization) ?? null,
      industry: optionalText(c.industry) ?? null,
      headcount: optionalText(c.headcount) ?? null,
      country: optionalText(c.country) ?? null,
      city: optionalText(c.city) ?? null,
      emailCount: optionalNumber(optionalRow(c.emails_count).total) ?? null
    }));
    return {
      output: {
        companies,
        totalCount: optionalNumber(result.meta.results),
        returnedCount: companies.length
      },
      message: `Retrieved **${companies.length}** matching companies.`
    };
  })
  .build();
