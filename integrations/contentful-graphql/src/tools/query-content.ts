import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryContent = SlateTool.create(spec, {
  name: 'Query Content',
  key: 'query_content',
  description: `Execute a GraphQL query against published content in Contentful. Uses the Content Delivery API (CDA) token to fetch published entries and assets.

Allows you to run any valid GraphQL query against the auto-generated schema for your Contentful space. You can query single entries by ID, query collections with filters and sorting, traverse linked entries, and resolve rich text references — all in a single request.`,
  instructions: [
    'The GraphQL schema is auto-generated from your content model. Use the **Introspect Schema** tool first to discover available types and fields.',
    'Collection queries follow the pattern: `{contentTypeCollection { items { ... } }}` where contentType is the camelCase name of your content type.',
    'Single entry queries follow the pattern: `{contentType(id: "entry-id") { ... }}`.',
    'Use the `locale` argument on fields to override the locale for that field.',
    'Use variables for dynamic values rather than string interpolation in queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'The GraphQL query string to execute against the Contentful Content Delivery API.'
        ),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Optional variables for the GraphQL query. Keys are variable names, values are their corresponding values.'
        )
    })
  )
  .output(
    z.object({
      queryResult: z.any().describe('The data returned by the GraphQL query.'),
      errors: z
        .array(z.any())
        .optional()
        .describe('GraphQL errors, if any occurred during query execution.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGraphQLClient(ctx.config, ctx.auth);

    let result = await client.query(ctx.input.query, ctx.input.variables);

    let hasErrors = result.errors && result.errors.length > 0;

    return {
      output: {
        queryResult: result.data || null,
        errors: result.errors
      },
      message: hasErrors
        ? `Query executed with **${result.errors.length} error(s)**. Check the errors field for details.`
        : `Query executed successfully.`
    };
  })
  .build();
