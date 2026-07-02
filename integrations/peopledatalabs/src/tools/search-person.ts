import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let personSummarySchema = z.object({
  personId: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  workEmail: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  jobCompanyName: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  industry: z.string().nullable().optional()
});

export let searchPerson = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_person',
  description: `Search and filter the full Person Dataset of nearly three billion profiles using SQL or Elasticsearch query syntax. Useful for finding groups of people matching specific criteria such as job title, company, location, skills, or education.
Returns matching person records with pagination support.`,
  instructions: [
    'Provide either a SQL query or an Elasticsearch JSON query string, but not both.',
    "SQL example: `SELECT * FROM person WHERE job_title_role='engineering' AND location_country='united states'`",
    'Elasticsearch example: `{"bool":{"must":[{"term":{"job_title_role":"engineering"}}]}}`',
    'Use scroll_token from the response to paginate through results.'
  ],
  constraints: [
    'Maximum of 100 results per request (size parameter).',
    'Each record returned consumes one API credit.',
    'Deep pagination beyond 10,000 records requires scroll tokens.'
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
          "SQL query to search for persons (e.g. \"SELECT * FROM person WHERE location_country='united states' AND job_title='software engineer'\")"
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
      dataset: z.string().optional().describe('Dataset to search (default: "all")'),
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
      persons: z.array(personSummarySchema).describe('Matching person records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let result = await client.searchPerson({
      sql: ctx.input.sql,
      query: ctx.input.elasticsearchQuery,
      size: ctx.input.size,
      scroll_token: ctx.input.scrollToken,
      dataset: ctx.input.dataset,
      titlecase: ctx.input.titlecase
    });

    let persons = (result.data || []).map((record: any) => ({
      personId: record.id ?? null,
      fullName: record.full_name ?? null,
      firstName: record.first_name ?? null,
      lastName: record.last_name ?? null,
      linkedinUrl: record.linkedin_url ?? null,
      workEmail: record.work_email ?? null,
      jobTitle: record.job_title ?? null,
      jobCompanyName: record.job_company_name ?? null,
      locationName: record.location_name ?? null,
      industry: record.industry ?? null
    }));

    return {
      output: {
        total: result.total ?? 0,
        scrollToken: result.scroll_token ?? null,
        persons
      },
      message: `Found **${result.total ?? 0}** matching persons. Returned **${persons.length}** records in this page.${result.scroll_token ? ' Use the scroll token to fetch the next page.' : ''}`
    };
  })
  .build();
