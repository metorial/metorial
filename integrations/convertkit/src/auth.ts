import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { kitApiError, kitServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z.enum(['oauth', 'api_key']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Public',
        description: 'Full access to your Kit account data and functionality',
        scope: 'public'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://api.kit.com/v4/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.kit.com/v4'
      });

      let data: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        created_at: number;
      };

      try {
        let response = await http.post('/oauth/token', {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        });
        data = response.data as typeof data;
      } catch (error) {
        throw kitApiError(error, 'OAuth token exchange');
      }

      let expiresAt = new Date((data.created_at + data.expires_in) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw kitServiceError('Kit OAuth refresh token is missing.');
      }

      let http = createAxios({
        baseURL: 'https://api.kit.com/v4'
      });

      let data: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        created_at: number;
      };

      try {
        let response = await http.post('/oauth/token', {
          client_id: ctx.clientId,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        });
        data = response.data as typeof data;
      } catch (error) {
        throw kitApiError(error, 'OAuth token refresh');
      }

      let expiresAt = new Date((data.created_at + data.expires_in) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authMethod: 'oauth' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let http = createAxios({
        baseURL: 'https://api.kit.com/v4',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data: {
        user: { id: number; email: string };
        account: { id: number; name: string };
      };

      try {
        let response = await http.get('/account');
        data = response.data as typeof data;
      } catch (error) {
        throw kitApiError(error, 'OAuth profile lookup');
      }

      return {
        profile: {
          id: String(data.user.id),
          email: data.user.email,
          name: data.account.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Kit V4 API Key (found in Developer tab of account settings)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.kit.com/v4',
        headers: {
          'X-Kit-Api-Key': ctx.output.token
        }
      });

      let data: {
        user: { id: number; email: string };
        account: { id: number; name: string };
      };

      try {
        let response = await http.get('/account');
        data = response.data as typeof data;
      } catch (error) {
        throw kitApiError(error, 'API key profile lookup');
      }

      return {
        profile: {
          id: String(data.user.id),
          email: data.user.email,
          name: data.account.name
        }
      };
    }
  });
