import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRepositoryToken = SlateTool.create(spec, {
  name: 'Manage Repository Tokens',
  key: 'manage_repository_token',
  description: `Create, list, or delete repository API tokens. Repository tokens provide scoped access to a single repository and are commonly used for uploading coverage data via the Codacy Coverage Reporter.`,
  instructions: [
    'To list tokens, set action to "list".',
    'To create a new token, set action to "create".',
    'To delete a token, set action to "delete" and provide the tokenId.'
  ],
  constraints: ['Maximum of 100 tokens per repository.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform.'),
      tokenId: z.string().optional().describe('Token ID (required for delete action).')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(z.any())
        .optional()
        .describe('List of repository tokens (for list action).'),
      createdToken: z
        .string()
        .optional()
        .describe(
          'Newly created repository API token value (for create action). Store this securely as it cannot be retrieved later.'
        ),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the token was deleted (for delete action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let response = await client.listRepositoryTokens(ctx.input.repositoryName);
      let tokens = response.data ?? [];

      return {
        output: { tokens },
        message: `Found **${tokens.length}** repository token(s) for **${ctx.input.repositoryName}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let response = await client.createRepositoryToken(ctx.input.repositoryName);
      let data = response.data ?? response;
      let tokenValue = data.token ?? data;

      return {
        output: { createdToken: String(tokenValue) },
        message: `Created a new repository API token for **${ctx.input.repositoryName}**. Store this token securely.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tokenId) {
        throw new Error('tokenId is required for deleting a repository token.');
      }

      await client.deleteRepositoryToken(ctx.input.repositoryName, ctx.input.tokenId);

      return {
        output: { deleted: true },
        message: `Deleted repository token **${ctx.input.tokenId}** from **${ctx.input.repositoryName}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
