import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { typeformApiError, typeformServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Typeform OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://www.typeform.com/developers/get-started/applications/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.typeform.com/developers/get-started/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Account Read',
        description: 'Read basic account information',
        scope: 'accounts:read'
      },
      {
        title: 'Forms Read',
        description: 'Read forms',
        scope: 'forms:read'
      },
      {
        title: 'Forms Write',
        description: 'Create, update, and delete forms',
        scope: 'forms:write'
      },
      {
        title: 'Images Read',
        description: 'Read images',
        scope: 'images:read'
      },
      {
        title: 'Images Write',
        description: 'Upload and delete images',
        scope: 'images:write'
      },
      {
        title: 'Themes Read',
        description: 'Read themes',
        scope: 'themes:read'
      },
      {
        title: 'Themes Write',
        description: 'Create, update, and delete themes',
        scope: 'themes:write'
      },
      {
        title: 'Responses Read',
        description: 'Read form responses',
        scope: 'responses:read'
      },
      {
        title: 'Responses Write',
        description: 'Delete form responses',
        scope: 'responses:write'
      },
      {
        title: 'Webhooks Read',
        description: 'Read webhooks',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks Write',
        description: 'Create, update, and delete webhooks',
        scope: 'webhooks:write'
      },
      {
        title: 'Workspaces Read',
        description: 'Read workspaces',
        scope: 'workspaces:read'
      },
      {
        title: 'Workspaces Write',
        description: 'Create, update, and delete workspaces',
        scope: 'workspaces:write'
      },
      {
        title: 'Offline',
        description:
          'Request a refresh token. Use only when the Typeform app token expiration period is set to one week; unlimited-token apps must leave this unchecked.',
        scope: 'offline',
        defaultChecked: false
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://api.typeform.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let client = createAxios({
        baseURL: 'https://api.typeform.com'
      });

      let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let response: any;
      try {
        response = await client.post('/oauth/token', body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        throw typeformApiError('exchanging OAuth code', error);
      }

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
      };

      if (!data.access_token) {
        throw typeformServiceError('Failed to obtain access token from Typeform.');
      }

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw typeformServiceError(
          'No refresh token available. Ensure the "offline" scope was requested during authorization.'
        );
      }

      let client = createAxios({
        baseURL: 'https://api.typeform.com'
      });

      let body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let response: any;
      try {
        response = await client.post('/oauth/token', body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        throw typeformApiError('refreshing OAuth token', error);
      }

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
      };

      if (!data.access_token) {
        throw typeformServiceError('Failed to refresh access token from Typeform.');
      }

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let client = createAxios({
        baseURL: 'https://api.typeform.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response: any;
      try {
        response = await client.get('/me');
      } catch (error) {
        throw typeformApiError('retrieving OAuth profile', error);
      }

      let data = response.data as {
        user_id?: string;
        alias?: string;
        email?: string;
        language?: string;
      };

      return {
        profile: {
          id: data.user_id,
          name: data.alias,
          email: data.email,
          language: data.language
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string().describe('Typeform personal access token (starts with tfp_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.typeform.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response: any;
      try {
        response = await client.get('/me');
      } catch (error) {
        throw typeformApiError('retrieving token profile', error);
      }

      let data = response.data as {
        user_id?: string;
        alias?: string;
        email?: string;
        language?: string;
      };

      return {
        profile: {
          id: data.user_id,
          name: data.alias,
          email: data.email,
          language: data.language
        }
      };
    }
  });
