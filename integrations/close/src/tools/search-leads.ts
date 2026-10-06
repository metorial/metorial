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
    'Use nextCursor within 30 seconds for pagination. Legacy skip is implemented by reading and discarding bounded cursor pages; large offsets are inefficient.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Next-page cursor from nextCursor. Expires after 30 seconds; cannot be combined with nonzero skip.'
        ),
      query: z
        .record(z.string(), z.any())
        .describe(
          'Advanced search query object (e.g., { "type": "and", "queries": [{ "type": "field_condition", "field": { "type": "regular_field", "object_type": "lead", "field_name": "name" }, "condition": { "type": "text", "mode": "full_words", "value": "Acme" } }] })'
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
          'Sort objects with field {type:"regular_field", object_type:"lead", field_name:"date_created"} and direction. Legacy field_name is normalized.'
        )
    })
  )
  .output(
    z.object({
      nextCursor: z
        .string()
        .optional()
        .describe(
          'Next page cursor. Expires after 30 seconds; reuse the same query, fields and sort.'
        ),
      leads: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of lead objects matching the search query'),
      totalResults: z.number().optional().describe('Total number of leads matching the query'),
      hasMore: z.boolean().describe('Whether there are more results beyond the current page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).searchLeads(ctx.input.query, ctx.input);
    return {
      output: {
        leads: result.data,
        totalResults: result.count?.total,
        hasMore: result.cursor !== null,
        nextCursor: result.cursor ?? undefined
      },
      message: `Returned ${result.data.length} lead(s)${result.cursor ? '; use nextCursor promptly for the next page' : ''}.`
    };
  })
  .build();
