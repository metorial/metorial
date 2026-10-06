import { SlateAuth } from 'slates';
import { z } from 'zod';
import { baseUrl, Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional(),
      workspaceId: z.string().optional(),
      expiresAt: z.number().nullable().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Hex API token (personal access token prefixed with hxtp_ or workspace token prefixed with hxtw_)'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS origin of your Hex deployment. Defaults to https://app.hex.tech; EU and single-tenant deployments use their Hex origin.'
        )
    }),
    getOutput: async ctx => {
      const origin = baseUrl(ctx.input.baseUrl ?? ctx.config?.baseUrl);
      const identity = await new Client({
        token: ctx.input.token,
        baseUrl: origin
      }).getCurrentUser();
      return {
        output: {
          token: ctx.input.token,
          baseUrl: origin,
          workspaceId: identity.workspaceId,
          expiresAt: identity.expiresAt
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { baseUrl?: string };
      config?: Record<string, unknown>;
    }) => {
      const identity = await new Client({
        token: ctx.output.token,
        baseUrl: ctx.output.baseUrl ?? ctx.input.baseUrl ?? ctx.config?.baseUrl
      }).getCurrentUser();
      return {
        profile: {
          name: identity.email ?? 'Hex Workspace',
          workspaceId: identity.workspaceId,
          userId: identity.userId,
          email: identity.email
        }
      };
    }
  });
