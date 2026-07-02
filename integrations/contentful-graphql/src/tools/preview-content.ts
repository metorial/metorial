import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { spec } from '../spec';

export let previewContent = SlateTool.create(spec, {
  name: 'Preview Content',
  key: 'preview_content',
  description: `Execute a GraphQL query against draft/unpublished content in Contentful. Uses the Content Preview API (CPA) token to fetch both published and unpublished entries.

Useful for building preview environments where editors can see content before it goes live. The query syntax is identical to the published content query, but results include draft entries that haven't been published yet.`,
  instructions: [
    'Requires a Content Preview API (CPA) token to be configured in authentication.',
    'Returns both published and unpublished content — useful for editorial previews.',
    'The same GraphQL schema applies as for published queries.'
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
          'The GraphQL query string to execute against the Contentful Content Preview API.'
        ),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional variables for the GraphQL query.')
    })
  )
  .output(
    z.object({
      queryResult: z
        .any()
        .describe('The data returned by the GraphQL query (includes draft content).'),
      errors: z
        .array(z.any())
        .optional()
        .describe('GraphQL errors, if any occurred during query execution.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.previewToken) {
      throw new Error(
        'A Content Preview API (CPA) token is required to preview draft content. Configure it in the authentication settings.'
      );
    }

    let client = createGraphQLClient(ctx.config, ctx.auth, { preview: true });

    let result = await client.query(ctx.input.query, ctx.input.variables);

    let hasErrors = result.errors && result.errors.length > 0;

    return {
      output: {
        queryResult: result.data || null,
        errors: result.errors
      },
      message: hasErrors
        ? `Preview query executed with **${result.errors.length} error(s)**. Check the errors field for details.`
        : `Preview query executed successfully (includes draft content).`
    };
  })
  .build();
