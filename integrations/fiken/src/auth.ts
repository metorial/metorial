import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { FikenClient } from './lib/client';
import { fikenApiError } from './lib/errors';

export let authOutputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  redirectUri: z.string().optional()
});

export type FikenAuthOutput = z.infer<typeof authOutputSchema>;

let oauthHttp = createAxios({
  baseURL: 'https://fiken.no'
});

let basicAuthHeader = (clientId: string, clientSecret: string) =>
  `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

let requestToken = async (
  operation: string,
  clientId: string,
  clientSecret: string,
  params: URLSearchParams
) =>
  requestAxiosData<Record<string, unknown>>(
    operation,
    () =>
      oauthHttp.post('/oauth/token', params.toString(), {
        headers: {
          Authorization: basicAuthHeader(clientId, clientSecret),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
    fikenApiError
  );

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'Fiken OAuth2',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Fiken API OAuth documentation',
        url: 'https://api.fiken.no/api/v2/docs/'
      }
    ],
    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://fiken.no/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let data = await requestToken(
        'OAuth token exchange',
        ctx.clientId,
        ctx.clientSecret,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          state: ctx.state
        })
      );

      let token = normalizeOAuthTokenResponse(data, {
        providerLabel: 'Fiken',
        operation: 'token exchange',
        accessTokenMessage: 'Fiken OAuth token exchange did not return an access token.'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          redirectUri: ctx.redirectUri
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: FikenAuthOutput;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('No Fiken refresh token is available.', {
          reason: 'fiken_missing_refresh_token'
        });
      }

      let data = await requestToken(
        'OAuth token refresh',
        ctx.clientId,
        ctx.clientSecret,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        })
      );

      let token = normalizeOAuthTokenResponse(data, {
        providerLabel: 'Fiken',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        accessTokenMessage: 'Fiken OAuth refresh did not return an access token.'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          redirectUri: ctx.output.redirectUri
        }
      };
    },

    getProfile: async (ctx: { output: FikenAuthOutput }) => {
      let client = new FikenClient(ctx.output);
      let user = await client.getUser();
      let companies = await client.listCompanies({ page: 0, pageSize: 1 });
      let email = typeof user.email === 'string' ? user.email : undefined;
      let name = typeof user.name === 'string' ? user.name : (email ?? 'Fiken user');

      return {
        profile: {
          id: email ?? name,
          name,
          email,
          metadata: {
            accessibleCompanyCount: companies.resultCount ?? companies.items.length
          }
        }
      };
    }
  });
