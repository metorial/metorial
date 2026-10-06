import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapQuery } from '../lib/models';
import { spec } from '../spec';

let querySchema = z.object({
  queryId: z.string().describe('Unique identifier of the query'),
  name: z.string().optional().describe('Name of the query'),
  datasourceId: z.string().optional().describe('ID of the datasource the query belongs to'),
  parameters: z.array(z.unknown()).optional().describe('Parameters the query accepts'),
  queryVerb: z
    .string()
    .optional()
    .describe('HTTP method or query type (read, create, update, delete)')
});

export let searchQueries = SlateTool.create(spec, {
  name: 'Search Queries',
  key: 'search_queries',
  description: `Search for pre-configured queries in a Budibase application by name. Returns query IDs, names, and parameter definitions that can be used with the "Execute Query" tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Application ID to search queries in'),
      name: z.string().optional().describe('Filter queries by name')
    })
  )
  .output(
    z.object({
      queries: z.array(querySchema).describe('List of matching queries')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx, ctx.input.appId);
    let results = await client.searchQueries({ name: ctx.input.name });

    let queries = results.map(row => mapQuery(row));

    return {
      output: { queries },
      message: `Found **${queries.length}** query/queries${ctx.input.name ? ` matching "${ctx.input.name}"` : ''} in application ${ctx.input.appId}.`
    };
  })
  .build();
