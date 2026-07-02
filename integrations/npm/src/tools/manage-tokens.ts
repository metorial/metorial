import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

let tokenInfoSchema = z
  .object({
    tokenKey: z.string().describe('Token key/identifier (redacted form)'),
    tokenName: z.string().optional().describe('Human-readable token name'),
    created: z.string().optional().describe('Creation timestamp'),
    expires: z.string().optional().describe('Expiration timestamp'),
    readonly: z.boolean().optional().describe('Whether the token is read-only'),
    cidrWhitelist: z.array(z.string()).optional().describe('CIDR ranges allowed')
  })
  .passthrough();

export let manageTokens = SlateTool.create(spec, {
  name: 'Manage Access Tokens',
  key: 'manage_tokens',
  description: `List, create, or delete npm granular access tokens. Tokens can be scoped to specific packages, organizations, and permissions with CIDR restrictions and custom expiration.`,
  instructions: [
    'Creating tokens requires a session token and the account password.',
    'Read-write tokens have a maximum 90-day lifetime; read-only tokens have no maximum.',
    'If 2FA is enabled, provide the otp field with your one-time password.'
  ],
  constraints: [
    'Token creation requires a session token (from npm login), not a granular token.',
    'Write tokens are limited to 90 days maximum.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete'])
        .describe(
          '"list" to view tokens, "create" to make a new token, "delete" to revoke a token'
        ),
      page: z.number().optional().describe('Page number for listing (default 0)'),
      perPage: z.number().optional().describe('Results per page for listing (default 10)'),
      password: z.string().optional().describe('Account password (required for "create")'),
      tokenName: z.string().optional().describe('Human-readable name for the new token'),
      tokenDescription: z.string().optional().describe('Description for the new token'),
      expiresIn: z
        .string()
        .optional()
        .describe('Expiration for new token (e.g. "7d", "30d", "90d", or ISO date)'),
      permission: z
        .enum(['read-only', 'read-write'])
        .optional()
        .describe('Permission level for new token (default "read-only")'),
      cidrWhitelist: z
        .array(z.string())
        .optional()
        .describe('CIDR IP ranges allowed to use the token'),
      packages: z.array(z.string()).optional().describe('Restrict token to specific packages'),
      scopes: z.array(z.string()).optional().describe('Restrict token to specific scopes'),
      orgs: z
        .array(z.string())
        .optional()
        .describe('Restrict token to specific organizations'),
      bypass2fa: z
        .boolean()
        .optional()
        .describe('Allow token to bypass 2FA for automated workflows'),
      otp: z.string().optional().describe('One-time password for 2FA verification'),
      tokenKey: z
        .string()
        .optional()
        .describe('Token key/ID to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(tokenInfoSchema)
        .optional()
        .describe('List of tokens (for "list" action)'),
      createdToken: z
        .object({
          tokenKey: z.string().describe('Token key'),
          token: z.string().describe('Full token value (only shown once at creation)'),
          created: z.string().optional(),
          expires: z.string().optional()
        })
        .optional()
        .describe('Newly created token details (for "create" action)'),
      deleted: z.boolean().optional().describe('Whether the token was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTokens(ctx.input.page, ctx.input.perPage);
      let tokens = (result.objects || []).map((t: any) => ({
        tokenKey: t.key || t.token,
        tokenName: t.name,
        created: t.created,
        expires: t.expires,
        readonly: t.readonly,
        cidrWhitelist: t.cidr_whitelist
      }));
      return {
        output: { tokens },
        message: `Found **${tokens.length}** access token(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.password) throw new Error('Password is required to create a token.');

      let result = await client.createToken({
        password: ctx.input.password,
        name: ctx.input.tokenName,
        description: ctx.input.tokenDescription,
        expires: ctx.input.expiresIn,
        cidrWhitelist: ctx.input.cidrWhitelist,
        packages: ctx.input.packages,
        scopes: ctx.input.scopes,
        orgs: ctx.input.orgs,
        permission: ctx.input.permission,
        bypass2fa: ctx.input.bypass2fa,
        otp: ctx.input.otp
      });

      return {
        output: {
          createdToken: {
            tokenKey: result.key || result.id,
            token: result.token,
            created: result.created,
            expires: result.expires
          }
        },
        message: `Created new **${ctx.input.permission || 'read-only'}** token${ctx.input.tokenName ? ` "${ctx.input.tokenName}"` : ''}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tokenKey) throw new Error('tokenKey is required to delete a token.');

      await client.deleteToken(ctx.input.tokenKey, ctx.input.otp);
      return {
        output: { deleted: true },
        message: `Deleted token \`${ctx.input.tokenKey}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
