import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

const exchange = async (ctx: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) => {
  const http = createAuthenticatedAxios({
    timeout: 30000,
    maxRedirects: 0,
    contentType: 'application/x-www-form-urlencoded',
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Convex',
        reason: 'convex_oauth_error',
        parent: {},
        extractMessage: () =>
          'Token exchange failed. Check application credentials and the exact registered callback URL.'
      })
  });
  const response = await http.post(
    'https://api.convex.dev/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: ctx.code,
      redirect_uri: ctx.redirectUri,
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret
    }).toString()
  );
  return {
    token: normalizeOAuthTokenResponse(response.data, { providerLabel: 'Convex' }).token,
    authType: 'oauth' as const
  };
};
const authorizationUrl = (
  level: 'team' | 'project',
  ctx: { clientId: string; redirectUri: string; state: string }
) =>
  `https://dashboard.convex.dev/oauth/authorize/${level}?${new URLSearchParams({
    client_id: ctx.clientId,
    redirect_uri: ctx.redirectUri,
    state: ctx.state,
    response_type: 'code'
  }).toString()}`;

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['deploy_key', 'oauth']).describe('The type of authentication used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Deploy Key',
    key: 'deploy_key',
    inputSchema: z.object({
      deployKey: z
        .string()
        .describe('Convex deploy key from the dashboard deployment settings')
    }),
    getOutput: async ctx => {
      if (!ctx.input.deployKey.trim())
        throw createApiServiceError('Provide a Convex deploy key.');
      return {
        output: {
          token: ctx.input.deployKey.trim(),
          authType: 'deploy_key' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Team or Project OAuth (Legacy)',
    key: 'oauth',
    // Convex selects its authorization tier through the URL, not OAuth scope names.
    scopes: [],
    inputSchema: z.object({
      scopeLevel: z
        .enum(['team', 'project'])
        .default('team')
        .describe('Whether to authorize at team or project level')
    }),
    getAuthorizationUrl: async ctx => {
      let scopeLevel = ctx.input.scopeLevel || 'team';
      return {
        url: authorizationUrl(scopeLevel, ctx),
        input: ctx.input
      };
    },
    handleCallback: async ctx => {
      return {
        output: await exchange(ctx),
        input: ctx.input
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth_project',
    name: 'Project OAuth',
    scopes: [],
    getAuthorizationUrl: async ctx => ({ url: authorizationUrl('project', ctx) }),
    handleCallback: async ctx => ({ output: await exchange(ctx) })
  })
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth_team',
    name: 'Team OAuth',
    scopes: [],
    getAuthorizationUrl: async ctx => ({ url: authorizationUrl('team', ctx) }),
    handleCallback: async ctx => ({ output: await exchange(ctx) })
  });
