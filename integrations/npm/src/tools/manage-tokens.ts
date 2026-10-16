import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import {
  array,
  optionalNumber,
  optionalStrings,
  optionalText,
  record,
  stringRecord,
  text
} from '../lib/response';
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
    'If 2FA is enabled, provide an OTP from your configured method. Otherwise, omit otp on the first create request to trigger npm’s email challenge, then retry with the emailed code.'
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
      tokenName: z
        .string()
        .optional()
        .describe('Human-readable name for the new token (required for create)'),
      tokenDescription: z.string().optional().describe('Description for the new token'),
      expiresIn: z
        .string()
        .optional()
        .describe('Expiration for new token (e.g. "7d", "30d", "90d", or ISO date)'),
      orgPermission: z
        .enum(['read-only', 'read-write', 'no-access'])
        .optional()
        .describe(
          'Permission for the selected organizations. Defaults are determined by npm.'
        ),
      permission: z
        .enum(['read-only', 'read-write'])
        .optional()
        .describe(
          'Package and scope permission for the new token. npm defaults to read-only when packages/scopes are selected, otherwise no-access.'
        ),
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
      otp: z
        .string()
        .optional()
        .describe(
          'One-time password for 2FA or email verification. For accounts without 2FA, omit on the initial create request, then retry with the emailed code.'
        ),
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
      rawResponse: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Unmodified provider token metadata. A created token value is included only in the creation response.'
        ),
      total: z.number().optional().describe('Total available tokens, when provided by npm'),
      urls: z
        .record(z.string(), z.string())
        .optional()
        .describe('Pagination URLs provided by npm'),
      deleted: z.boolean().optional().describe('Whether the token was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = record(
        await client.listTokens(ctx.input.page, ctx.input.perPage),
        'token list'
      );
      let tokens = array(result.objects, 'token list entries').map(value => {
        let token = record(value, 'token entry');
        return {
          tokenKey: text(token.key, 'token key'),
          tokenName: optionalText(token.name, 'token name'),
          created: optionalText(token.created, 'token creation date'),
          expires: optionalText(token.expiry ?? token.expires, 'token expiry'),
          readonly: typeof token.readonly === 'boolean' ? token.readonly : undefined,
          cidrWhitelist: optionalStrings(
            token.cidr ?? token.cidr_whitelist,
            'token CIDR ranges'
          )
        };
      });
      return {
        output: {
          tokens,
          rawResponse: result,
          total: optionalNumber(result.total, 'token total'),
          urls:
            result.urls == null
              ? undefined
              : stringRecord(result.urls, 'token pagination URLs')
        },
        message: `Retrieved **${tokens.length}** access token(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.password)
        throw createApiServiceError('Password is required to create a token.');

      if (!ctx.input.tokenName)
        throw createApiServiceError('tokenName is required to create a token.');

      let result = record(
        await client.createToken({
          password: ctx.input.password,
          name: ctx.input.tokenName,
          description: ctx.input.tokenDescription,
          expires: ctx.input.expiresIn,
          cidrWhitelist: ctx.input.cidrWhitelist,
          packages: ctx.input.packages,
          scopes: ctx.input.scopes,
          orgs: ctx.input.orgs,
          permission: ctx.input.permission,
          orgPermission: ctx.input.orgPermission,
          bypass2fa: ctx.input.bypass2fa,
          otp: ctx.input.otp
        }),
        'created token'
      );

      return {
        output: {
          rawResponse: result,
          createdToken: {
            tokenKey: text(result.key ?? result.id, 'created token key'),
            token: text(result.token, 'created token value'),
            created: optionalText(result.created, 'token creation date'),
            expires: optionalText(result.expiry ?? result.expires, 'token expiry')
          }
        },
        message: `Created new access token${ctx.input.tokenName ? ` "${ctx.input.tokenName}"` : ''}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tokenKey)
        throw createApiServiceError('tokenKey is required to delete a token.');

      await client.deleteToken(ctx.input.tokenKey, ctx.input.otp);
      return {
        output: { deleted: true },
        message: 'Deleted the requested access token.'
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
