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
    'Parameters are passed as key-value string pairs and override default values set in the builder.'
  ]
})
  .input(
    z.object({
      appId: z.string().describe('Application ID containing the query'),
      queryId: z.string().describe('ID of the query to execute'),
      parameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Dynamic parameters to pass to the query as key-value pairs')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Query execution results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      appId: ctx.input.appId
    });
    let results = await client.executeQuery(
      ctx.input.queryId,
      ctx.input.parameters as Record<string, string> | undefined
    );

    return {
      output: { results },
      message: `Executed query **${ctx.input.queryId}** successfully.`
    };
  })
  .build();
