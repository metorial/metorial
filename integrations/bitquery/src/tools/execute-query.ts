import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute GraphQL Query',
  key: 'execute_query',
  description: `Execute a custom GraphQL query against the Bitquery API. Supports the full Bitquery GraphQL schema for querying blockchain data across 40+ networks.
Use this for advanced or custom queries not covered by the other tools. The query must be a valid Bitquery GraphQL query string.`,
  instructions: [
    'Refer to the Bitquery IDE (ide.bitquery.io) for schema exploration and query building.',
    'For V2, top-level fields include EVM, Solana, Tron, bitcoin, etc. For V1, use ethereum, bitcoin, etc.',
    'Variables should match the variable declarations in your query.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The GraphQL query string to execute'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional variables to pass with the GraphQL query')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The raw query result data from Bitquery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    ctx.info('Executing custom GraphQL query');

    let result = await client.query(ctx.input.query, ctx.input.variables);

    return {
      output: { result },
      message: 'GraphQL query executed successfully.'
    };
  })
  .build();
