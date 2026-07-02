import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeGraphQL = SlateTool.create(spec, {
  name: 'Execute GraphQL Query',
  key: 'execute_graphql',
  description: `Executes an arbitrary GraphQL query or mutation against the Grafbase Management API. Use this for operations not covered by other tools, or to access the full capabilities of the Grafbase API.

The Grafbase API has introspection enabled, so you can use this to explore the schema with introspection queries.`,
  instructions: [
    'The API endpoint is https://api.grafbase.com/graphql (or custom for self-hosted).',
    'Use introspection queries to discover available types and operations.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      query: z.string().describe('GraphQL query or mutation string'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('GraphQL variables as key-value pairs')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Raw response data from the GraphQL API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.executeGraphQL(ctx.input.query, ctx.input.variables);

    return {
      output: {
        result
      },
      message: `GraphQL query executed successfully.`
    };
  })
  .build();
