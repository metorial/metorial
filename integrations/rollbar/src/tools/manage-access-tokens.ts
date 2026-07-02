import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccessTokens = SlateTool.create(spec, {
  name: 'Manage Project Access Tokens',
  key: 'manage_access_tokens',
  description: `List, create, update rate limits, or delete project access tokens in Rollbar.
Requires an **account-level** access token or a project token with write scope.`,
  instructions: [
    'Use action "list" with projectId to see all tokens for a project.',
    'Use action "create" with projectId, name, and scopes to create a new token.',
    'Use action "update" with projectId and tokenValue to update rate limits.',
    'Use action "delete" with projectId and tokenValue to delete a token.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      projectId: z.number().describe('Project ID'),
      tokenValue: z
        .string()
        .optional()
        .describe('Access token string value (required for "update" and "delete" actions)'),
      name: z.string().optional().describe('Token name (required for "create" action)'),
      scopes: z
        .array(z.enum(['post_server_item', 'post_client_item', 'read', 'write']))
        .optional()
        .describe('Token scopes (required for "create" action)'),
      rateLimitWindowSize: z
        .number()
        .optional()
        .describe('Rate limit window size in seconds (for "create" and "update")'),
      rateLimitWindowCount: z
        .number()
        .optional()
        .describe(
          'Maximum number of calls in the rate limit window (for "create" and "update")'
        )
    })
  )
  .output(
    z.object({
      accessToken: z
        .object({
          name: z.string().describe('Token name'),
          tokenValue: z.string().describe('Token string value'),
          scopes: z.array(z.string()).optional().describe('Token scopes'),
          status: z.string().optional().describe('Token status'),
          rateLimitWindowSize: z.number().optional().describe('Rate limit window size'),
          rateLimitWindowCount: z.number().optional().describe('Rate limit window count')
        })
        .optional()
        .describe('Single access token (for create/update)'),
      accessTokens: z
        .array(
          z.object({
            name: z.string().describe('Token name'),
            tokenValue: z.string().describe('Token string value'),
            scopes: z.array(z.string()).optional().describe('Token scopes'),
            status: z.string().optional().describe('Token status'),
            rateLimitWindowSize: z.number().optional().describe('Rate limit window size'),
            rateLimitWindowCount: z.number().optional().describe('Rate limit window count')
          })
        )
        .optional()
        .describe('List of access tokens'),
      deleted: z.boolean().optional().describe('Whether the token was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapToken = (t: any) => ({
      name: t.name,
      tokenValue: t.access_token,
      scopes: t.scopes,
      status: t.status,
      rateLimitWindowSize: t.rate_limit_window_size,
      rateLimitWindowCount: t.rate_limit_window_count
    });

    if (ctx.input.action === 'list') {
      let result = await client.listProjectAccessTokens(ctx.input.projectId);
      let tokens = (result?.result || []).map(mapToken);
      return {
        output: { accessTokens: tokens },
        message: `Found **${tokens.length}** access tokens for project ${ctx.input.projectId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for "create" action');
      if (!ctx.input.scopes) throw new Error('scopes are required for "create" action');
      let result = await client.createProjectAccessToken(ctx.input.projectId, {
        name: ctx.input.name,
        scopes: ctx.input.scopes,
        rate_limit_window_size: ctx.input.rateLimitWindowSize,
        rate_limit_window_count: ctx.input.rateLimitWindowCount
      });
      let token = mapToken(result?.result);
      return {
        output: { accessToken: token },
        message: `Created access token **${token.name}** with scopes: ${token.scopes?.join(', ')}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tokenValue) throw new Error('tokenValue is required for "update" action');
      let result = await client.updateProjectAccessToken(
        ctx.input.projectId,
        ctx.input.tokenValue,
        {
          rate_limit_window_size: ctx.input.rateLimitWindowSize,
          rate_limit_window_count: ctx.input.rateLimitWindowCount
        }
      );
      let token = mapToken(result?.result);
      return {
        output: { accessToken: token },
        message: `Updated rate limits for access token **${token.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tokenValue) throw new Error('tokenValue is required for "delete" action');
      await client.deleteProjectAccessToken(ctx.input.projectId, ctx.input.tokenValue);
      return {
        output: { deleted: true },
        message: `Deleted access token from project **${ctx.input.projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
