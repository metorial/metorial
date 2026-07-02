import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companySummarySchema = z.object({
  companyId: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  founded: z.number().nullable().optional(),
  locationName: z.string().nullable().optional(),
  type: z.string().nullable().optional()
});

export let searchCompany = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_company',
  description: `Search and filter the full Company Dataset using SQL or Elasticsearch query syntax. Useful for finding companies matching specific criteria such as industry, size, location, or funding stage.
Returns matching company records with pagination support.`,
  instructions: [
    'Provide either a SQL query or an Elasticsearch JSON query string, but not both.',
    "SQL example: `SELECT * FROM company WHERE industry='technology' AND location_country='united states'`",
    'Use scroll_token from the response to paginate through results.'
  ],
  constraints: [
    'Maximum of 100 results per request.',
    'Each record returned consumes one API credit.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sql: z
        .string()
        .optional()
        .describe(
          'SQL query to search for companies (e.g. "SELECT * FROM company WHERE industry=\'technology\'")'
        ),
      elasticsearchQuery: z
        .string()
        .optional()
        .describe('Elasticsearch DSL query as JSON string'),
      size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return per page (1-100, default 10)'),
      scrollToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous search response'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching records'),
      scrollToken: z
        .string()
        .nullable()
        .optional()
        .describe('Token to fetch the next page of results'),
      companies: z.array(companySummarySchema).describe('Matching company records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.searchCompany({
      sql: ctx.input.sql,
      query: ctx.input.elasticsearchQuery,
      size: ctx.input.size,
      scroll_token: ctx.input.scrollToken,
      titlecase: ctx.input.titlecase
    });

    let companies = (result.data || []).map((record: any) => ({
      companyId: record.id ?? null,
      name: record.name ?? null,
      displayName: record.display_name ?? null,
      websiteUrl: record.website ?? null,
      linkedinUrl: record.linkedin_url ?? null,
      size: record.size ?? null,
      industry: record.industry ?? null,
      founded: record.founded ?? null,
      locationName: record.location?.name ?? null,
      type: record.type ?? null
    }));

    return {
      output: {
        total: result.total ?? 0,
        scrollToken: result.scroll_token ?? null,
        companies
      },
      message: `Found **${result.total ?? 0}** matching companies. Returned **${companies.length}** records in this page.${result.scroll_token ? ' Use the scroll token to fetch the next page.' : ''}`
    };
  })
  .build();
