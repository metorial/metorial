import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let getBaseUrl = (environment: string) =>
  environment === 'sandbox'
    ? 'https://gateway.remote-sandbox.com'
    : 'https://gateway.remote.com';

let scopes = [
  {
    title: 'Company Manage',
    description: 'Full access to manage company data and employments',
    scope: 'https://gateway.remote.com/company.manage'
  }
];

function createRemoteOauth(name: string, key: string, environment: 'production' | 'sandbox') {
  let baseUrl = getBaseUrl(environment);

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }
      return { url: `${baseUrl}/auth/oauth2/authorize?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);
      let http = createAxios({ baseURL: baseUrl });
      let response = await http.post(
        '/auth/oauth2/token',
        `grant_type=authorization_code&code=${encodeURIComponent(ctx.code)}`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          environment
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);
      let http = createAxios({ baseURL: baseUrl });
      let response = await http.post(
        '/auth/oauth2/token',
        'grant_type=refresh_token&refresh_token=' +
          encodeURIComponent(ctx.output.refreshToken ?? ''),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt,
          environment
        }
      };
    }
  };
}

function createRemoteApiToken(
  name: string,
  key: string,
  environment: 'production' | 'sandbox'
) {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      apiToken: z.string().describe('Remote API token (starts with ra_live or ra_test)')
    }),
    getOutput: async (ctx: { input: { apiToken: string } }) => ({
      output: {
        token: ctx.input.apiToken,
        environment
      }
    })
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox'])
    })
  )
  .addOauth(createRemoteOauth('Production', 'oauth_production', 'production'))
  .addOauth(createRemoteOauth('Sandbox', 'oauth_sandbox', 'sandbox'))
  .addTokenAuth(
    createRemoteApiToken('API Token (Production)', 'api_token_production', 'production')
  )
  .addTokenAuth(createRemoteApiToken('API Token (Sandbox)', 'api_token_sandbox', 'sandbox'));
