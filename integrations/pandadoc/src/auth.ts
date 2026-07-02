import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { applyPandaDocApiErrorInterceptor } from './lib/client';
import { pandadocServiceError } from './lib/errors';

let apiAxios = createAxios({
  baseURL: 'https://api.pandadoc.com'
});
applyPandaDocApiErrorInterceptor(apiAxios);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'api_key'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.pandadoc.com/reference/authentication-process'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.pandadoc.com/reference/authentication-process'
      }
    ],

    scopes: [
      {
        title: 'Read',
        description: 'Read access to documents, templates, contacts, and other resources',
        scope: 'read'
      },
      {
        title: 'Write',
        description:
          'Write access to create, update, and delete documents, templates, contacts, and other resources',
        scope: 'write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join('+');
      let url = `https://app.pandadoc.com/oauth2/authorize?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&scope=${scopeString}&response_type=code`;
      return { url };
    },

    handleCallback: async ctx => {
      let params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', ctx.clientId);
      params.append('client_secret', ctx.clientSecret);
      params.append('code', ctx.code);
      params.append('redirect_uri', ctx.redirectUri);

      let response = await apiAxios.post('/oauth2/access_token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
            ? new Date(data.expires_at * 1000).toISOString()
            : undefined,
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw pandadocServiceError('No PandaDoc refresh token is available.');
      }

      let params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', ctx.clientId);
      params.append('client_secret', ctx.clientSecret);
      params.append('refresh_token', ctx.output.refreshToken);

      let response = await apiAxios.post('/oauth2/access_token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_at
            ? new Date(data.expires_at * 1000).toISOString()
            : undefined,
          authType: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let response = await apiAxios.get('/public/v1/members/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let member = response.data;

      return {
        profile: {
          id: member.user_id || member.id,
          email: member.email,
          name: [member.first_name, member.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: member.avatar || undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('PandaDoc API key (Sandbox or Production)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await apiAxios.get('/public/v1/members/current', {
        headers: {
          Authorization: `API-Key ${ctx.output.token}`
        }
      });

      let member = response.data;

      return {
        profile: {
          id: member.user_id || member.id,
          email: member.email,
          name: [member.first_name, member.last_name].filter(Boolean).join(' ') || undefined,
          imageUrl: member.avatar || undefined
        }
      };
    }
  });
