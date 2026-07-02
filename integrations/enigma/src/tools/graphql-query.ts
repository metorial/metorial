import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let graphqlQuery = SlateTool.create(spec, {
  name: 'GraphQL Query',
  key: 'graphql_query',
  description: `Execute a custom GraphQL query against Enigma's API. Enables flexible queries for businesses, brands, operating locations, legal entities, and their relationships.

Use this for advanced queries that combine search, filtering, and nested data retrieval in a single request. Supports the full Enigma GraphQL schema including brands, operating locations, legal entities, card transactions, industries, and more.`,
  instructions: [
    "Refer to Enigma's GraphQL schema for available types and fields.",
    'Use the search query with SearchInput to find businesses by name, entity type, and address.',
    'Pagination uses Relay-style cursors with first/last/after/before parameters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('GraphQL query string'),
      variables: z.record(z.string(), z.any()).optional().describe('GraphQL query variables')
    })
  )
  .output(
    z.object({
      queryResult: z.any().describe('The data returned by the GraphQL query'),
      errors: z
        .array(
          z.object({
            message: z.string(),
            locations: z.any().optional(),
            path: z.any().optional()
          })
        )
        .optional()
        .describe('GraphQL errors, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.graphqlQuery(ctx.input.query, ctx.input.variables);

    let errors = result.errors;
    let queryResult = result.data;

    let message =
      errors && errors.length > 0
        ? `GraphQL query completed with **${errors.length}** error(s): ${errors.map((e: Record<string, unknown>) => e.message).join(', ')}`
        : `GraphQL query executed successfully.`;

    return {
      output: {
        queryResult,
        errors
      },
      message
    };
  })
  .build();
