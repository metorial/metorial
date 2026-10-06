import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl } from '../lib/client';
import { spec } from '../spec';

export let manageAccessTokens = SlateTool.create(spec, {
  name: 'Manage Access Tokens',
  key: 'manage_access_tokens',
  description: `List access-token metadata for the authenticated user, create a personal access token, or revoke a token by ID. Listings can include personal and refresh-token metadata.`,
  tags: { destructive: true },
  instructions: [
    'When creating a token, the token value is only returned once. Store it securely.',
    'Set expiresAt as a unix timestamp up to 2 years in the future. Omit or set to 0 for no expiry.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      description: z
        .string()
        .optional()
        .describe('Description for new token (required for create)'),
      expiresAt: z
        .number()
        .optional()
        .describe('Unix timestamp for token expiry (0 or omit for no expiry, max 2 years)'),
      tokenId: z.string().optional().describe('Token ID to delete (required for delete)'),
      showExpired: z.boolean().optional().describe('Include expired tokens in list'),
      continuationToken: z
        .string()
        .optional()
        .describe('Request one token page from this token'),
      maxResults: z
        .number()
        .optional()
        .describe('Positive token page size; omit both paging fields to retrieve all pages.')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(
          z.object({
            tokenId: z.string().optional(),
            description: z.string().optional(),
            lastUsed: z.number().optional(),
            tokenValue: z.string().optional(),
            type: z.string().optional(),
            name: z.string().optional(),
            expires: z.number().optional(),
            created: z.string().optional()
          })
        )
        .optional(),
      createdToken: z
        .object({
          tokenId: z.string(),
          tokenValue: z.string()
        })
        .optional(),
      deleted: z.boolean().optional(),
      continuationToken: z.string().optional(),
      returnedCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listPersonalAccessTokens(
          ctx.input.showExpired,
          ctx.input.continuationToken,
          ctx.input.maxResults
        );
        let tokens = result.tokens.map(t => ({
          tokenId: t.id,
          description: t.description,
          lastUsed: t.lastUsed,
          type: t.type,
          name: t.name,
          expires: t.expires,
          created: t.created
        }));
        return {
          output: {
            tokens,
            continuationToken: result.continuationToken,
            returnedCount: tokens.length
          },
          message: `Found **${tokens.length}** access-token metadata record(s)`
        };
      }
      case 'create': {
        if (!ctx.input.description)
          throw createApiServiceError('description is required when creating a token');
        let result = await client.createPersonalAccessToken(
          ctx.input.description,
          ctx.input.expiresAt
        );
        return {
          output: {
            createdToken: {
              tokenId: result.id,
              tokenValue: result.tokenValue
            }
          },
          message: `Created personal access token **${result.id}** — store the token value securely, it cannot be retrieved again`
        };
      }
      case 'delete': {
        if (!ctx.input.tokenId)
          throw createApiServiceError('tokenId is required when deleting a token');
        await client.deletePersonalAccessToken(ctx.input.tokenId);
        return {
          output: { deleted: true },
          message: `Revoked access token **${ctx.input.tokenId}**`
        };
      }
    }
  })
  .build();
