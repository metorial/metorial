import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let filterSchema = z.object({
  propertyName: z.string().describe('Name of the property to filter on'),
  operator: z
    .enum([
      'EQ',
      'NEQ',
      'LT',
      'LTE',
      'GT',
      'GTE',
      'BETWEEN',
      'IN',
      'NOT_IN',
      'HAS_PROPERTY',
      'NOT_HAS_PROPERTY',
      'CONTAINS_TOKEN',
      'NOT_CONTAINS_TOKEN'
    ])
    .describe('Filter operator'),
  value: z.string().optional().describe('Value to compare against'),
  values: z.array(z.string()).optional().describe('Multiple values for IN/NOT_IN operators'),
  highValue: z.string().optional().describe('Upper bound for BETWEEN operator')
});

let filterGroupSchema = z.object({
  filters: z.array(filterSchema).describe('Filters within this group (AND logic)')
});

let sortSchema = z.object({
  propertyName: z.string().describe('Property to sort by'),
  direction: z.enum(['ASCENDING', 'DESCENDING']).describe('Sort direction')
});

export let searchCrm = SlateTool.create(spec, {
  name: 'Search CRM',
  key: 'search_crm',
  description: `Search for CRM objects in HubSpot using filters, query text, and sorting. Supports searching contacts, companies, deals, tickets, and any other object type. Filter groups use OR logic between groups and AND logic within each group.`,
  instructions: [
    'Use filterGroups for precise filtering. Multiple groups use OR logic; filters within a group use AND logic.',
    'Use query for full-text search across default searchable properties.',
    'Specify properties to return only the fields you need.'
  ],
  constraints: [
    'Maximum of 10,000 results per search.',
    'Maximum of 5 filter groups with up to 6 filters each.'
  ],
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.searchCrm)
  .input(
    z.object({
      objectType: z
        .string()
        .describe('CRM object type to search (e.g., contacts, companies, deals, tickets)'),
      query: z.string().optional().describe('Full-text search query'),
      filterGroups: z
        .array(filterGroupSchema)
        .optional()
        .describe('Filter groups (OR logic between groups, AND logic within)'),
      sorts: z.array(sortSchema).optional().describe('Sort criteria'),
      properties: z.array(z.string()).optional().describe('Properties to return in results'),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Number of results to return (max 200)'),
      after: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            objectId: z.string().describe('Object ID'),
            properties: z.record(z.string(), z.any()).describe('Object properties'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('Search results'),
      total: z.number().describe('Total number of matching results'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);

    let result = await client.searchObjects(ctx.input.objectType, {
      query: ctx.input.query,
      filterGroups: ctx.input.filterGroups,
      sorts: ctx.input.sorts,
      properties: ctx.input.properties,
      limit: ctx.input.limit || 10,
      after: ctx.input.after
    });

    let results = (result.results || []).map((r: any) => ({
      objectId: r.id,
      properties: r.properties,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      output: {
        results,
        total: result.total || 0,
        hasMore: results.length < (result.total || 0)
      },
      message: `Found **${result.total || 0}** ${ctx.input.objectType} matching the search criteria (returned ${results.length})`
    };
  })
  .build();
