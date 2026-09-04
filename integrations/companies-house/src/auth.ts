import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { IDENTITY_BASE_URL } from './lib/constants';
import { companiesHouseApiError } from './lib/errors';

let identityHttp = createAxios({ baseURL: IDENTITY_BASE_URL });
let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.enum(['api_key', 'oauth']).optional()
});

type AuthOutput = z.infer<typeof outputSchema>;
type OAuthRefreshContext = {
  output: AuthOutput;
  clientId: string;
  clientSecret: string;
};
type OAuthProfileContext = {
  output: AuthOutput;
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Companies House API key. Create or manage keys at https://developer.company-information.service.gov.uk/manage-applications'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        authMethod: 'api_key' as const
      }
    })
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.company-information.service.gov.uk/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scope documentation',
        url: 'https://developer-specs.company-information.service.gov.uk/companies-house-identity-service/guides/ServerWeb'
      }
    ],
    scopes: [
      {
        title: 'Read User Profile',
        description: 'Read the authenticated Companies House user profile',
        scope: 'https://identity.company-information.service.gov.uk/user/profile.read'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length > 0) params.set('scope', ctx.scopes.join(' '));

      return {
        url: `${IDENTITY_BASE_URL}/oauth2/authorise?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response: { data: unknown };
      try {
        response = await identityHttp.post(
          '/oauth2/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch (error) {
        throw companiesHouseApiError(error, 'exchange the OAuth code', [
          ctx.code,
          ctx.clientSecret
        ]);
      }

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Companies House',
        operation: 'token exchange'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Companies House refresh token is missing; reconnect the account.'
        );
      }

      let response: { data: unknown };
      try {
        response = await identityHttp.post(
          '/oauth2/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch (error) {
        throw companiesHouseApiError(error, 'refresh the OAuth token', [
          ctx.output.refreshToken,
          ctx.clientSecret
        ]);
      }

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Companies House',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: OAuthProfileContext) => {
      let response: { data: unknown };
      try {
        response = await identityHttp.get('/user/profile', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });
      } catch (error) {
        throw companiesHouseApiError(error, 'read the OAuth user profile', [ctx.output.token]);
      }

      let profile = response.data;
      if (!isRecord(profile) || typeof profile.id !== 'string' || !profile.id) {
        throw createApiServiceError(
          'Companies House user profile response did not include an id.'
        );
      }
      let name = [profile.forename, profile.surname]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ');
      let email = typeof profile.email === 'string' ? profile.email : undefined;

      return {
        profile: {
          id: profile.id,
          name: name || email,
          email
        }
      };
    }
  });
