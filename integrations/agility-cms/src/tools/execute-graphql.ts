import { SlateTool } from 'slates';
import { z } from 'zod';
import { FetchClient } from '../lib/client';
import { spec } from '../spec';

export let executeGraphql = SlateTool.create(spec, {
  name: 'Execute GraphQL Query',
  key: 'execute_graphql',
  description: `Executes a GraphQL query against the Agility CMS GraphQL API. The schema is auto-generated from your content models. Supports flexible field selection, filtering, and sorting. Currently only supports content queries (not pages or templates).`,
  instructions: [
    'The GraphQL schema is auto-generated from your Agility CMS content models.',
    'Filter operators match the REST API: eq, ne, lt, gt, lte, gte, in, contains, like.'
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
        .describe('Variables to pass to the GraphQL query'),
      locale: z.string().optional().describe('Locale code override'),
      apiType: z
        .enum(['fetch', 'preview'])
        .default('fetch')
        .describe('Use "fetch" for published or "preview" for staging content')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The GraphQL query result data'),
      errors: z.array(z.any()).optional().describe('Any GraphQL errors returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FetchClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region,
      apiType: ctx.input.apiType
    });

    let result = await client.executeGraphQL(ctx.input.query, ctx.input.variables);

    return {
      output: {
        result: result.data ?? result,
        errors: result.errors
      },
      message: result.errors?.length
        ? `GraphQL query returned **${result.errors.length}** error(s)`
        : `GraphQL query executed successfully`
    };
  })
  .build();
