import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireField } from '../lib/errors';
import { spec } from '../spec';

let serviceTokenShape = z.object({
  serviceTokenId: z.string(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  token: z.string().optional().describe('Service token value when returned by PlanetScale'),
  plainTextRefreshToken: z
    .string()
    .optional()
    .describe('Plain text refresh token when returned by PlanetScale'),
  avatarUrl: z.string().optional(),
  actorId: z.string().optional(),
  actorDisplayName: z.string().optional(),
  actorType: z.string().optional(),
  expiresAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  accesses: z.array(z.any()).optional()
});

let mapServiceToken = (token: any) => ({
  serviceTokenId: token.id,
  name: token.name,
  displayName: token.display_name,
  token: token.token,
  plainTextRefreshToken: token.plain_text_refresh_token,
  avatarUrl: token.avatar_url,
  actorId: token.actor_id,
  actorDisplayName: token.actor_display_name,
  actorType: token.actor_type,
  expiresAt: token.expires_at,
  lastUsedAt: token.last_used_at,
  createdAt: token.created_at,
  updatedAt: token.updated_at,
  accesses: token.service_token_accesses
});

export let manageServiceToken = SlateTool.create(spec, {
  name: 'Manage Service Token',
  key: 'manage_service_token',
  description: `List, create, get, or delete PlanetScale service tokens for the configured organization.`,
  instructions: [
    'Use action "list" to list service tokens.',
    'Use action "create" to create a service token. The token value is only available when PlanetScale returns it.',
    'Use action "get" to retrieve service token metadata.',
    'Use action "delete" to revoke a service token.'
  ],
  constraints: [
    'PlanetScale service token APIs require service token authentication with read_service_tokens, write_service_tokens, or delete_service_tokens access as appropriate.',
    'OAuth tokens cannot call PlanetScale service token management endpoints.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Action to perform'),
      serviceTokenId: z
        .string()
        .optional()
        .describe('Service token ID (required for get and delete)'),
      name: z.string().optional().describe('Display name for a new service token'),
      ttl: z.number().optional().describe('Time-to-live in seconds for a new service token'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Results per page for list pagination')
    })
  )
  .output(
    z.object({
      serviceTokens: z.array(serviceTokenShape).optional(),
      serviceToken: serviceTokenShape.optional(),
      deleted: z.boolean().optional(),
      currentPage: z.number().optional(),
      nextPage: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    if (ctx.input.action === 'list') {
      let result = await client.listServiceTokens({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let serviceTokens = result.data.map(mapServiceToken);

      return {
        output: {
          serviceTokens,
          currentPage: result.currentPage,
          nextPage: result.nextPage
        },
        message: `Found **${serviceTokens.length}** PlanetScale service token(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      let serviceTokenId = requireField(
        ctx.input.serviceTokenId,
        'serviceTokenId',
        'delete action'
      );
      await client.deleteServiceToken(serviceTokenId);
      return {
        output: { deleted: true },
        message: `Deleted service token **${serviceTokenId}**.`
      };
    }

    let serviceToken =
      ctx.input.action === 'create'
        ? await client.createServiceToken({
            name: ctx.input.name,
            ttl: ctx.input.ttl
          })
        : await client.getServiceToken(
            requireField(ctx.input.serviceTokenId, 'serviceTokenId', 'get action')
          );

    return {
      output: { serviceToken: mapServiceToken(serviceToken) },
      message:
        ctx.input.action === 'create'
          ? `Created service token **${serviceToken.display_name || serviceToken.name || serviceToken.id}**.`
          : `Retrieved service token **${serviceToken.display_name || serviceToken.name || serviceToken.id}**.`
    };
  });
