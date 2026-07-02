import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApiTokens = SlateTool.create(spec, {
  name: 'Manage API Tokens',
  key: 'manage_api_tokens',
  description: `List, create, revoke, or validate API tokens. API tokens are used for authenticating with the Turso Platform API.`,
  instructions: ['When creating a token, store it securely — it is only shown once.'],
  constraints: ['Newly created tokens are only returned once and cannot be retrieved later.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'revoke', 'validate']).describe('Action to perform'),
      tokenName: z
        .string()
        .optional()
        .describe('Name of the token (for create/revoke actions)')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(
          z.object({
            tokenId: z.string(),
            tokenName: z.string()
          })
        )
        .optional()
        .describe('List of existing API tokens'),
      createdToken: z
        .object({
          tokenId: z.string(),
          tokenName: z.string(),
          tokenValue: z.string().describe('The JWT token value — store this securely')
        })
        .optional()
        .describe('Newly created token'),
      revokedTokenName: z.string().optional().describe('Name of the revoked token'),
      validationResult: z
        .object({
          expiresAt: z.string().describe('Token expiration (ISO 8601 string or "never")')
        })
        .optional()
        .describe('Token validation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let output: Record<string, unknown> = {};
    let message = '';

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listApiTokens();
        output.tokens = result.tokens.map(t => ({
          tokenId: t.id,
          tokenName: t.name
        }));
        message = `Found **${result.tokens.length}** API token(s).`;
        break;
      }
      case 'create': {
        if (!ctx.input.tokenName) {
          throw new Error('Token name is required for creating a token.');
        }
        let result = await client.createApiToken(ctx.input.tokenName);
        output.createdToken = {
          tokenId: result.id,
          tokenName: result.name,
          tokenValue: result.token
        };
        message = `Created API token **${result.name}**. Store the token securely — it will not be shown again.`;
        break;
      }
      case 'revoke': {
        if (!ctx.input.tokenName) {
          throw new Error('Token name is required for revoking a token.');
        }
        await client.revokeApiToken(ctx.input.tokenName);
        output.revokedTokenName = ctx.input.tokenName;
        message = `Revoked API token **${ctx.input.tokenName}**.`;
        break;
      }
      case 'validate': {
        let result = await client.validateApiToken();
        let expiresAt =
          result.exp === -1 ? 'never' : new Date(result.exp * 1000).toISOString();
        output.validationResult = {
          expiresAt
        };
        message = `Token is valid. Expires: ${expiresAt}.`;
        break;
      }
    }

    return {
      output: output as any,
      message
    };
  })
  .build();
