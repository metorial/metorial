import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { getHarvestAccounts } from './lib/identity';

let harvestIdApi = createAuthenticatedAxios({
  baseURL: 'https://id.getharvest.com/api/v2',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Harvest ID',
      reason: 'harvest_id_api_error'
    })
});

let getProfile = async (ctx: { output: { token: string } }) => {
  let { user } = await getHarvestAccounts(ctx.output.token);
  return {
    profile: {
      id: String(user.id),
      name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email
    }
  };
};

let getDefaultAccountId = async (token: string) => {
  let { accounts } = await getHarvestAccounts(token);
  return accounts.length === 1 ? String(accounts[0]!.id) : undefined;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      accountId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/'
      }
    ],
    scopes: [
      {
        title: 'Harvest Accounts',
        description: 'Access authorized Harvest accounts',
        scope: 'harvest:all'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        state: ctx.state,
        redirect_uri: ctx.redirectUri
      });
      if (ctx.scopes.length > 0) params.set('scope', ctx.scopes.join(' '));
      return { url: `https://id.getharvest.com/oauth2/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let response = await harvestIdApi.post(
        '/oauth2/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      let output = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Harvest',
        operation: 'authorization',
        required: true
      });
      return { output: { ...output, accountId: await getDefaultAccountId(output.token) } };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; accountId?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Harvest OAuth refresh token is missing. Reconnect your account.'
        );
      }
      let response = await harvestIdApi.post(
        '/oauth2/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString()
      );
      let output = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Harvest',
        operation: 'refresh',
        previousRefreshToken: ctx.output.refreshToken,
        required: true
      });
      return { output: { ...ctx.output, ...output } };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal Access Token from https://id.getharvest.com/developers')
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, accountId: await getDefaultAccountId(ctx.input.token) }
    }),
    getProfile
  });
