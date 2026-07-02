import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.brevo.com/v3'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['api_key', 'oauth']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Brevo API key from Settings > SMTP & API > API Keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: any) => {
      let response = await axios.get('/account', {
        headers: {
          'api-key': ctx.output.token
        }
      });
      let account = response.data;
      return {
        profile: {
          id: String(account.email),
          email: account.email,
          name:
            `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim() ||
            account.companyName ||
            account.email
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'OpenID',
        description: 'OpenID Connect authentication',
        scope: 'openid'
      },
      {
        title: 'Email',
        description: 'Access to email address',
        scope: 'email'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      },
      {
        title: 'Meta Info',
        description: 'Access to account meta information',
        scope: 'metaInfo'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });
      return {
        url: `https://auth.brevo.com/realms/apiv3/protocol/openid-connect/auth?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await axios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      let response = await axios.post(
        '/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken ?? ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: any) => {
      let response = await axios.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let account = response.data;
      return {
        profile: {
          id: String(account.email),
          email: account.email,
          name:
            `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim() ||
            account.companyName ||
            account.email
        }
      };
    }
  });
