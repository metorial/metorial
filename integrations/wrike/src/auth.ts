import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { WrikeClient } from './lib/client';

let createTokenClient = () =>
  createAuthenticatedAxios({
    contentType: 'application/x-www-form-urlencoded',
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Wrike',
        reason: 'wrike_oauth_error',
        detailKeys: ['errorDescription', 'error_description', 'error', 'message']
      })
  });

let getProfile = async (ctx: { output: { token: string; host: string } }) => {
  let client = new WrikeClient(ctx.output);
  let response = await client.getContacts({ me: true });
  let contact = response.data[0];
  if (!contact?.id) {
    throw createApiServiceError(
      'Wrike did not return the authenticated user. Check the connection permissions.',
      { reason: 'missing_user_profile' }
    );
  }
  return {
    profile: {
      id: contact.id,
      name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      email: contact.profiles?.[0]?.email
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      host: z.string().describe('Wrike API host, e.g. www.wrike.com or app-eu.wrike.com')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Read-Write Workspace',
        description: 'Read and write workspace tasks, projects, comments, and time entries',
        scope: 'wsReadWrite'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length > 0) params.set('scope', ctx.scopes.join(','));
      return { url: `https://login.wrike.com/oauth2/authorize/v4?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let response = await createTokenClient().post(
        'https://login.wrike.com/oauth2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Wrike',
            required: true
          }),
          host: response.data.host || 'www.wrike.com'
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      scopes: string[];
      output: { token: string; refreshToken?: string; expiresAt?: string; host: string };
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No Wrike refresh token is available. Reconnect the account.',
          { reason: 'missing_refresh_token' }
        );
      }
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });
      if (ctx.scopes.length > 0) params.set('scope', ctx.scopes.join(','));
      let response = await createTokenClient().post(
        `https://${ctx.output.host}/oauth2/token`,
        params.toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Wrike',
            required: true,
            previousRefreshToken: ctx.output.refreshToken
          }),
          host: response.data.host || ctx.output.host
        }
      };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Permanent Access Token',
    key: 'permanent_token',
    inputSchema: z.object({
      token: z.string().describe('Permanent access token generated from Wrike App Console'),
      host: z
        .string()
        .default('www.wrike.com')
        .describe('Wrike API host (e.g. www.wrike.com or app-eu.wrike.com)')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token, host: ctx.input.host } }),
    getProfile
  });
