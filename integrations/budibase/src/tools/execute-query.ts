import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute Query',
  key: 'execute_query',
  description: `Execute a pre-configured query in a Budibase application. Queries must first be created in the Budibase builder (e.g. REST API queries, SQL queries). Parameters can be passed dynamically at execution time.`,
  instructions: [
    'Use "Search Queries" to find available query IDs before executing.',
    'Parameters are passed as key-value string pairs and override default values set in the builder.',
    'Execution can change connected systems; inspect the configured query before invoking. For supported REST queries, pass native pagination returned by the previous execution.'
  ]
})
  .input(
    z.object({
      appId: z.string().describe('Application ID containing the query'),
      queryId: z.string().describe('ID of the query to execute'),
      parameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Dynamic parameters to pass to the query as key-value pairs'),
      pagination: z
        .object({
          page: z
            .string()
            .optional()
            .describe('Exact native page value from the preceding execution'),
          limit: z.number().int().min(1).max(1000).optional()
        })
        .optional()
    })
  )
  .output(
    z.object({
      results: z.unknown().describe('Query execution results'),
      pagination: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Native continuation information when supported by the configured query')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx, ctx.input.appId);
    let result = await client.executeQuery(
      ctx.input.queryId,
      ctx.input.parameters,
      ctx.input.pagination
    );

    return {
      output: result,
      message: `Executed query **${ctx.input.queryId}** successfully.`
    };
  })
  .build();
