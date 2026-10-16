import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireCodacyString } from '../lib/helpers';
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
      name: z
        .string()
        .optional()
        .describe(
          'Token name for create. When provided, also provide expiresAt; use 1-100 alphanumeric characters or dashes.'
        ),
      expiresAt: z
        .string()
        .optional()
        .describe(
          'Expiration timestamp for create. When provided, also provide name; must be in the future and at most one year from now.'
        ),
      tokenId: z.string().optional().describe('Token ID (required for delete action).')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Original Codacy response, including provider metadata.'),
      createdTokenId: z
        .number()
        .optional()
        .describe('ID of the created token, for later deletion.'),
      expiresAt: z.string().optional().describe('Provider-returned expiration timestamp.'),
      name: z.string().optional().describe('Provider-returned token name.'),
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
        output: { tokens, raw: response },
        message: `Found **${tokens.length}** repository token(s) for **${ctx.input.repositoryName}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: { name: string; expiresAt: string } | undefined;
      if (ctx.input.name !== undefined || ctx.input.expiresAt !== undefined) {
        if (ctx.input.name === undefined || ctx.input.expiresAt === undefined) {
          throw createApiServiceError(
            'Provide both name and expiresAt to customize the repository token.'
          );
        }
        if (!/^[A-Za-z0-9-]{1,100}$/.test(ctx.input.name)) {
          throw createApiServiceError(
            'Token name must contain 1-100 alphanumeric characters or dashes.'
          );
        }
        let expiration = Date.parse(ctx.input.expiresAt);
        let maximum = new Date();
        maximum.setUTCFullYear(maximum.getUTCFullYear() + 1);
        if (
          !Number.isFinite(expiration) ||
          expiration <= Date.now() ||
          expiration > maximum.getTime()
        ) {
          throw createApiServiceError(
            'expiresAt must be a valid future timestamp no more than one year from now.'
          );
        }
        body = { name: ctx.input.name, expiresAt: ctx.input.expiresAt };
      }
      let response = await client.createRepositoryToken(ctx.input.repositoryName, body);
      let data = response.data ?? response;
      let tokenValue = requireCodacyString(
        typeof data === 'string' ? data : data.token,
        'repositoryToken.token'
      );

      return {
        output: {
          createdToken: tokenValue,
          createdTokenId: data.id,
          expiresAt: data.expiresAt,
          name: data.name,
          raw: response
        },
        message: `Created a new repository API token for **${ctx.input.repositoryName}**. Store this token securely.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tokenId) {
        throw createApiServiceError('tokenId is required for deleting a repository token.');
      }

      await client.deleteRepositoryToken(ctx.input.repositoryName, ctx.input.tokenId);

      return {
        output: { deleted: true },
        message: `Deleted repository token **${ctx.input.tokenId}** from **${ctx.input.repositoryName}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
