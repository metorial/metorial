import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search leads in Close using advanced search/filtering. Uses the POST /data/search/ endpoint which supports complex query objects with boolean logic, field conditions, and nested queries. Useful for finding leads matching specific criteria like status, custom fields, activity dates, etc.`,
  instructions: [
    'The query parameter must be a JSON object representing a Close advanced search query (e.g., { "type": "and", "queries": [...] }).',
    'Use the fields parameter to limit which fields are returned for better performance.',
    'Results are paginated — use skip and limit to page through large result sets.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .record(z.string(), z.any())
        .describe(
          'Advanced search query object (e.g., { "type": "and", "queries": [{ "type": "field_condition", "field": { "type": "regular_field", "field_name": "lead_name" }, "condition": { "type": "text", "mode": "full_words", "value": "Acme" } }] })'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 100)'),
      skip: z.number().optional().describe('Number of results to skip for pagination'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Array of field names to include in the response (e.g., ["id", "display_name", "status_label"])'
        ),
      sort: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Array of sort objects (e.g., [{ "field_name": "date_created", "direction": "desc" }])'
        )
    })
  )
  .output(
    z.object({
      leads: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of lead objects matching the search query'),
      totalResults: z.number().describe('Total number of leads matching the query'),
      hasMore: z.boolean().describe('Whether there are more results beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchLeads(ctx.input.query, {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      fields: ctx.input.fields,
      sort: ctx.input.sort
    });

    let leads = result.data ?? [];
    let totalResults = result.total_results ?? 0;
    let _limit = ctx.input.limit ?? 100;
    let skip = ctx.input.skip ?? 0;
    let hasMore = skip + leads.length < totalResults;

    return {
      output: {
        leads,
        totalResults,
        hasMore
      },
      message: `Found **${totalResults}** lead(s) matching the search query (returning ${leads.length}).`
    };
  })
  .build();
