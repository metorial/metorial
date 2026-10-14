import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { optimizelyErrorMapping } from './lib/api-errors';

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  odpRegion?: 'us' | 'eu' | 'apac';
};
type OAuthRefreshContext = { output: AuthOutput; clientId: string; clientSecret: string };

let getCmsToken = async (clientId: string, clientSecret: string) => {
  let axios = createAxios({ errorMapping: optimizelyErrorMapping, timeout: 30000 });
  let response = await axios.post(
    'https://api.cms.optimizely.com/oauth/token',
    {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Optimizely CMS',
    required: true
  });
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      odpRegion: z.enum(['us', 'eu', 'apac']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Experimentation OAuth',
    key: 'experimentation_oauth',
    scopes: [
      {
        title: 'All Access',
        description: 'Full read and write access to Optimizely Experimentation',
        scope: 'all'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://app.optimizely.com/oauth2/authorize?${new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scopes: ctx.scopes.join(',')
      })}`
    }),
    handleCallback: async ctx => {
      let axios = createAxios({ errorMapping: optimizelyErrorMapping, timeout: 30000 });
      let response = await axios.post(
        'https://app.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Optimizely Experimentation'
        })
      };
    },
    handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'The Experimentation refresh token is missing. Reconnect the account.'
        );
      let axios = createAxios({ errorMapping: optimizelyErrorMapping, timeout: 30000 });
      let response = await axios.post(
        'https://app.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return {
        output: {
          ...ctx.output,
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Optimizely Experimentation',
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          })
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'CMP OAuth',
    key: 'cmp_oauth',
    scopes: [
      { title: 'Identity', description: 'Identify the connected CMP user', scope: 'openid' },
      {
        title: 'Profile',
        description: 'Read the connected CMP user profile',
        scope: 'profile'
      },
      {
        title: 'Offline Access',
        description: 'Refresh the CMP connection when the user is offline',
        scope: 'offline_access'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://accounts.cmp.optimizely.com/o/oauth2/v1/auth?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => {
      let axios = createAxios({ errorMapping: optimizelyErrorMapping, timeout: 30000 });
      let response = await axios.post(
        'https://accounts.cmp.optimizely.com/o/oauth2/v1/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Optimizely CMP',
          required: true
        })
      };
    },
    handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'The CMP refresh token is missing. Reconnect the account.'
        );
      let axios = createAxios({ errorMapping: optimizelyErrorMapping, timeout: 30000 });
      let response = await axios.post(
        'https://accounts.cmp.optimizely.com/o/oauth2/v1/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }
      );
      return {
        output: {
          ...ctx.output,
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Optimizely CMP',
            required: true,
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          })
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal Access Token generated from Profile > API Access > Generate New Token. Works for Experimentation APIs.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'CMS Client Credentials',
    key: 'cms_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('CMS API Client ID from Settings > API Keys'),
      clientSecret: z.string().describe('CMS API Client Secret')
    }),
    getOutput: async ctx => ({
      output: await getCmsToken(ctx.input.clientId, ctx.input.clientSecret)
    }),
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: { clientId: string; clientSecret: string };
    }) => ({
      output: {
        ...ctx.output,
        ...(await getCmsToken(ctx.input.clientId, ctx.input.clientSecret))
      }
    })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Campaign Basic Auth',
    key: 'campaign_basic_auth',
    inputSchema: z.object({
      username: z
        .string()
        .describe('Campaign API username from Administration > API Overview > REST API'),
      password: z.string().describe('Campaign API password')
    }),
    getOutput: async ctx => ({
      output: {
        token: `Basic ${Buffer.from(`${ctx.input.username}:${ctx.input.password}`, 'utf8').toString('base64')}`
      }
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'ODP API Key',
    key: 'odp_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'ODP API key from the ODP dashboard. Use a private key to query customer data.'
        ),
      region: z
        .enum(['us', 'eu', 'apac'])
        .optional()
        .describe('ODP account region. Defaults to US for existing connections.')
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, odpRegion: ctx.input.region }
    })
  });
