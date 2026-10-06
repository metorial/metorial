import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGraphQLClient } from '../lib/helpers';
import { queryFields } from '../lib/schemas';
import { spec } from '../spec';

export let previewContent = SlateTool.create(spec, {
  name: 'Preview Content',
  key: 'preview_content',
  description:
    'Execute a native read-only GraphQL query with a Content Preview API token. Draft reads require explicit preview: true arguments in the query or variables; published-only fields remain published-only. Select a space authorized by the preview key, using optional list_spaces discovery when a CMA token is available.',
  instructions: [
    'Requires a Content Preview API (CPA) token to be configured in authentication.',
    'Set preview: true on the fields whose draft state you need. This setting cascades to references unless overridden with preview: false.',
    'The query and variables are sent unchanged. Supplying a preview token alone does not enable draft reads.',
    'Reuse native offset or cursor pagination without rewriting cursor strings. Preview queries consume API quota and may resolve configured external references.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object(queryFields))
  .output(
    z.object({
      queryResult: z
        .any()
        .describe(
          'Native query data. Draft availability depends on explicit preview arguments and key access.'
        ),
      errors: z
        .array(z.any())
        .optional()
        .describe('GraphQL errors, if any occurred during query execution.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGraphQLClient(ctx.config, ctx.auth, { ...ctx.input, preview: true });

    let result = await client.query(
      ctx.input.query,
      ctx.input.variables,
      ctx.input.operationName
    );

    let hasErrors = result.errors && result.errors.length > 0;

    return {
      output: {
        queryResult: result.data ?? null,
        errors: result.errors
      },
      message: hasErrors
        ? `Preview query executed with **${result.errors?.length ?? 0} error(s)**. Check the errors field for details.`
        : 'Query executed with the preview token. Field preview arguments determine whether draft content was requested.'
    };
  })
  .build();
