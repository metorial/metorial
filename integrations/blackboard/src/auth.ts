import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { normalizeBaseUrl } from './lib/base-url';
import { blackboardApiError } from './lib/errors';

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  baseUrl?: string;
};
type OAuthRefreshContext = {
  output: AuthOutput;
  input: { baseUrl: string };
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let instanceUrl = z
  .string()
  .describe(
    'The base URL of your Blackboard Learn instance (e.g., https://yourschool.blackboard.com)'
  );

let tokenRequest = async (
  baseUrl: string,
  key: string,
  secret: string,
  values: Record<string, string>,
  previousRefreshToken?: string
) => {
  let http = createAuthenticatedAxios({
    baseURL: normalizeBaseUrl(baseUrl),
    authHeader: { value: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    contentType: 'application/x-www-form-urlencoded',
    errorAdapter: blackboardApiError
  });
  let response = await http.post(
    '/learn/api/public/v1/oauth2/token',
    new URLSearchParams(values).toString()
  );
  return {
    ...normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'Blackboard Learn',
      previousRefreshToken
    }),
    baseUrl: normalizeBaseUrl(baseUrl)
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      baseUrl: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (User Authorization)',
    key: 'oauth_3lo',
    scopes: [
      { title: 'Read', description: 'Read access to Blackboard Learn data', scope: 'read' },
      { title: 'Write', description: 'Write access to Blackboard Learn data', scope: 'write' },
      {
        title: 'Offline',
        description: 'Refresh access without repeated login',
        scope: 'offline'
      }
    ],
    inputSchema: z.object({ baseUrl: instanceUrl }),
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });
      return {
        url: `${normalizeBaseUrl(ctx.input.baseUrl)}/learn/api/public/v1/oauth2/authorizationcode?${params}`,
        input: ctx.input
      };
    },
    handleCallback: async ctx => ({
      output: await tokenRequest(ctx.input.baseUrl, ctx.clientId, ctx.clientSecret, {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      }),
      input: ctx.input
    }),
    handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available. Reauthorize with the offline scope.'
        );
      }
      return {
        output: await tokenRequest(
          ctx.output.baseUrl ?? ctx.input.baseUrl,
          ctx.clientId,
          ctx.clientSecret,
          { grant_type: 'refresh_token', refresh_token: ctx.output.refreshToken },
          ctx.output.refreshToken
        ),
        input: ctx.input
      };
    },
    getProfile: async (ctx: { output: AuthOutput; input: { baseUrl: string } }) => {
      let http = createAuthenticatedAxios({
        baseURL: normalizeBaseUrl(ctx.output.baseUrl ?? ctx.input.baseUrl),
        authHeader: { value: `Bearer ${ctx.output.token}` },
        errorAdapter: blackboardApiError
      });
      let { data: user } = await http.get('/learn/api/public/v1/users/me');
      return {
        profile: {
          id: user.id,
          email: user.contact?.email,
          name:
            [user.name?.given, user.name?.family].filter(Boolean).join(' ') || user.userName
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      baseUrl: instanceUrl,
      applicationKey: z
        .string()
        .describe('Application Key from your registered Blackboard developer application'),
      applicationSecret: z
        .string()
        .describe('Application Secret from your registered Blackboard developer application')
    }),
    getOutput: async ctx => ({
      output: await tokenRequest(
        ctx.input.baseUrl,
        ctx.input.applicationKey,
        ctx.input.applicationSecret,
        { grant_type: 'client_credentials' }
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: { baseUrl: string; applicationKey: string; applicationSecret: string };
    }) => ({
      output: await tokenRequest(
        ctx.output.baseUrl ?? ctx.input.baseUrl,
        ctx.input.applicationKey,
        ctx.input.applicationSecret,
        { grant_type: 'client_credentials' }
      )
    })
  });
