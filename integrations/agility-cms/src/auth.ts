import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let mgmtBaseUrls = {
  usa: 'https://mgmt.aglty.io',
  usa2: 'https://mgmt-usa2.aglty.io',
  canada: 'https://mgmt-ca.aglty.io',
  europe: 'https://mgmt-eu.aglty.io',
  australia: 'https://mgmt-aus.aglty.io'
} as const;

type Region = keyof typeof mgmtBaseUrls;

let scopes = [
  { title: 'OpenID', description: 'OpenID Connect authentication', scope: 'openid' },
  { title: 'Profile', description: 'Access to user profile information', scope: 'profile' },
  { title: 'Email', description: 'Access to user email address', scope: 'email' },
  {
    title: 'Offline Access',
    description: 'Enable refresh token for offline access',
    scope: 'offline_access'
  }
];

function createAgilityOauth(name: string, key: string, region: Region) {
  let baseUrl = mgmtBaseUrls[region]!;

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });
      return { url: `${baseUrl}/oauth/authorize?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let httpClient = createAxios({ baseURL: baseUrl });
      let response = await httpClient.post('/oauth/token', {
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authMethod: 'oauth' as const,
          region
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) return { output: ctx.output };
      let httpClient = createAxios({ baseURL: baseUrl });
      let response = await httpClient.post('/oauth/refresh', {
        refresh_token: ctx.output.refreshToken
      });
      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authMethod: 'oauth' as const,
          region
        }
      };
    }
  };
}

function createAgilityApiKey(name: string, key: string, region: Region) {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Agility CMS API Key (fetch or preview). Found in Settings > API Keys.')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => ({
      output: {
        token: ctx.input.apiKey,
        authMethod: 'api_key' as const,
        region
      }
    })
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API key or OAuth access token for authenticating requests'),
      refreshToken: z.string().optional().describe('OAuth refresh token for token renewal'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the access token expires'),
      authMethod: z
        .enum(['api_key', 'oauth'])
        .describe('Which authentication method is in use'),
      region: z.enum(['usa', 'usa2', 'canada', 'europe', 'australia'])
    })
  )
  .addOauth(createAgilityOauth('USA', 'oauth_usa', 'usa'))
  .addOauth(createAgilityOauth('USA 2', 'oauth_usa2', 'usa2'))
  .addOauth(createAgilityOauth('Canada', 'oauth_canada', 'canada'))
  .addOauth(createAgilityOauth('Europe', 'oauth_europe', 'europe'))
  .addOauth(createAgilityOauth('Australia', 'oauth_australia', 'australia'))
  .addTokenAuth(createAgilityApiKey('API Key (USA)', 'api_key_usa', 'usa'))
  .addTokenAuth(createAgilityApiKey('API Key (USA 2)', 'api_key_usa2', 'usa2'))
  .addTokenAuth(createAgilityApiKey('API Key (Canada)', 'api_key_canada', 'canada'))
  .addTokenAuth(createAgilityApiKey('API Key (Europe)', 'api_key_europe', 'europe'))
  .addTokenAuth(createAgilityApiKey('API Key (Australia)', 'api_key_australia', 'australia'));
