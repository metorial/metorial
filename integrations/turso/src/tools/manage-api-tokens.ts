import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

const outputSchema = z.object({
  tokens: z
    .array(
      z.object({
        tokenId: z.string(),
        tokenName: z.string(),
        organization: z.string().optional(),
        group: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        createdAt: z.string().optional()
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
});

export let manageApiTokens = SlateTool.create(spec, {
  tags: { readOnly: false, destructive: true },
  name: 'Manage API Tokens',
  key: 'manage_api_tokens',
  description: `List, create, revoke, or validate API tokens. API tokens are used for authenticating with the Turso Platform API.`,
  instructions: [
    'When creating a token, store it securely — it is only shown once.',
    'Prefer organization-scoped tokens. Unrestricted tokens are deprecated by Turso; existing tokens continue to work for now.',
    'Group-scoped Platform tokens differ from SQL tokens and require organization, group and scopes.'
  ],
  constraints: ['Newly created tokens are only returned once and cannot be retrieved later.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'revoke', 'validate']).describe('Action to perform'),
      organization: z
        .string()
        .optional()
        .describe(
          'Organization slug to restrict the new token to; discover it with list_organizations. Omit only for a legacy unrestricted token.'
        ),
      group: z
        .string()
        .optional()
        .describe(
          'Optional group name for a restricted Platform token; requires organization and scopes.'
        ),
      scopes: z
        .array(
          z.enum([
            'read',
            'db:create',
            'db:delete',
            'db:configure',
            'db:mint-token',
            'db:rotate-creds',
            'group:configure',
            'group:mint-token',
            'group:rotate-creds',
            'read-only',
            'full-access'
          ])
        )
        .optional()
        .describe(
          'Permissions for a group-scoped token. Rotation invalidates existing SQL credentials.'
        ),
      tokenName: z
        .string()
        .optional()
        .describe('Name of the token (for create/revoke actions)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let output: z.infer<typeof outputSchema> = {};
    let message = '';

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listApiTokens();
        output.tokens = result.tokens.map(t => ({
          tokenId: t.id,
          tokenName: t.name,
          organization: t.organization,
          group: t.group,
          scopes: t.scopes,
          createdAt: t.created_at
        }));
        message = `Found **${result.tokens.length}** API token(s).`;
        break;
      }
      case 'create': {
        if (!ctx.input.tokenName) {
          throw createApiServiceError('Token name is required for creating a token.');
        }
        let result = await client.createApiToken(ctx.input.tokenName, {
          organization: ctx.input.organization,
          group: ctx.input.group,
          scopes: ctx.input.scopes
        });
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
          throw createApiServiceError('Token name is required for revoking a token.');
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
      output,
      message
    };
  })
  .build();
