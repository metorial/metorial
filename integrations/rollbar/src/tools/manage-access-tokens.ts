import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, type Token } from '../lib/client';
import { spec } from '../spec';

const accessTokenSchema = z.object({
  name: z.string().describe('Token name'),
  tokenValue: z
    .string()
    .optional()
    .describe(
      'Token secret when returned by the provider. Encrypted token secrets are shown only at creation; save them securely.'
    ),
  publicId: z
    .string()
    .optional()
    .describe(
      'Public token identifier for rate-limit updates and deletion; cannot authenticate API calls'
    ),
  tokenType: z.string().optional().describe('Token format'),
  scopes: z.array(z.string()).optional().describe('Token scopes'),
  status: z.string().optional().describe('Token status'),
  rateLimitWindowSize: z.number().optional().describe('Rate limit window size'),
  rateLimitWindowCount: z.number().optional().describe('Rate limit window count')
});
const mapToken = (token: Token) => ({
  name: token.name,
  tokenValue: token.access_token,
  publicId: token.public_id,
  tokenType: token.token_type,
  scopes: token.scopes,
  status: token.status,
  rateLimitWindowSize: token.rate_limit_window_size,
  rateLimitWindowCount: token.rate_limit_window_count
});
export let manageAccessTokens = SlateTool.create(spec, {
  name: 'Manage Project Access Tokens',
  key: 'manage_access_tokens',
  description:
    'List, create, update rate limits, or delete project access tokens. Requires an account token with read scope for listing/readback and write scope for mutations. New tokens use encrypted v2 format; token secrets are available only at creation.',
  instructions: [
    'Use tokenPublicId from list/create for updates and deletion. tokenValue supports legacy token secrets.',
    'Use separate ingestion and read/write tokens. post_server_item and post_client_item cannot be combined with read or write.',
    'Deleting or rate-limiting a token can interrupt applications. Select only the intended token.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation'),
      projectId: z.number().describe('Project ID from manage_project'),
      tokenValue: z
        .string()
        .optional()
        .describe('Legacy token secret for update/delete; do not combine with tokenPublicId'),
      tokenPublicId: z
        .string()
        .optional()
        .describe('Public token identifier for update/delete; preferred for encrypted tokens'),
      name: z.string().optional().describe('Token name, required for create'),
      scopes: z
        .array(z.enum(['post_server_item', 'post_client_item', 'read', 'write']))
        .optional()
        .describe('Scopes, required for create'),
      rateLimitWindowSize: z
        .number()
        .optional()
        .describe('Rate-limit window seconds; positive for create, nonnegative for update'),
      rateLimitWindowCount: z
        .number()
        .optional()
        .describe(
          'Calls per window; positive for create, zero disables an existing token’s limit'
        )
    })
  )
  .output(
    z.object({
      accessToken: accessTokenSchema.optional().describe('Created or updated token'),
      accessTokens: z.array(accessTokenSchema).optional().describe('Project tokens'),
      deleted: z.boolean().optional().describe('Whether deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.action === 'list') {
      const tokens = (await client.listProjectAccessTokens(ctx.input.projectId)).result.map(
        mapToken
      );
      return {
        output: { accessTokens: tokens },
        message: `Found ${tokens.length} project tokens.`
      };
    }
    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.scopes)
        throw createApiServiceError('name and scopes are required for create.');
      const token = mapToken(
        (
          await client.createProjectAccessToken(ctx.input.projectId, {
            name: ctx.input.name,
            scopes: ctx.input.scopes,
            rate_limit_window_size: ctx.input.rateLimitWindowSize,
            rate_limit_window_count: ctx.input.rateLimitWindowCount
          })
        ).result
      );
      return {
        output: { accessToken: token },
        message: `Created token ${token.name}. Save its secret securely; it may not be shown again.`
      };
    }
    if (
      (!ctx.input.tokenValue && !ctx.input.tokenPublicId) ||
      (ctx.input.tokenValue !== undefined && ctx.input.tokenPublicId !== undefined)
    )
      throw createApiServiceError(
        'Provide exactly one tokenPublicId or legacy tokenValue for update/delete.'
      );
    const identifier = {
      public_id: ctx.input.tokenPublicId,
      project_access_token: ctx.input.tokenValue
    };
    if (ctx.input.action === 'update') {
      const token = mapToken(
        (
          await client.updateProjectAccessToken(ctx.input.projectId, identifier, {
            rate_limit_window_size: ctx.input.rateLimitWindowSize,
            rate_limit_window_count: ctx.input.rateLimitWindowCount
          })
        ).result
      );
      return {
        output: { accessToken: token },
        message: `Updated rate limits for token ${token.name}.`
      };
    }
    await client.deleteProjectAccessToken(ctx.input.projectId, identifier);
    return { output: { deleted: true }, message: 'Deleted the selected project token.' };
  })
  .build();
