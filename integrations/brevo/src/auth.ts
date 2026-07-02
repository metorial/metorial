import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { brevoApiError, brevoServiceError } from './lib/errors';

let apiAxios = createAxios({
  baseURL: 'https://api.brevo.com/v3'
});

let oauthAxios = createAxios({
  baseURL: 'https://oauth.brevo.com/realms/partner/oauth'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      scope: z.string().optional(),
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
      try {
        let response = await apiAxios.get('/account', {
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
      } catch (error) {
        throw brevoApiError(error, 'get profile');
      }
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Account read',
        description: 'Read account details and configured senders',
        scope: 'account:read'
      },
      {
        title: 'Contacts read',
        description: 'Read contacts, lists, segments, attributes, and folders',
        scope: 'contacts:read'
      },
      {
        title: 'Contacts write',
        description: 'Create, update, and delete contacts, lists, and folders',
        scope: 'contacts:write'
      },
      {
        title: 'CRM read',
        description: 'Read companies, deals, tasks, notes, and pipelines',
        scope: 'crm:read'
      },
      {
        title: 'CRM write',
        description: 'Create, update, and delete companies and deals',
        scope: 'crm:write'
      },
      {
        title: 'Email campaigns read',
        description: 'Read email campaigns and statistics',
        scope: 'campaigns.email:read'
      },
      {
        title: 'Email campaigns write',
        description: 'Create, update, send, and delete email campaigns',
        scope: 'campaigns.email:write'
      },
      {
        title: 'Transactional email write',
        description: 'Send transactional emails',
        scope: 'transactional.email:write'
      },
      {
        title: 'Transactional SMS write',
        description: 'Send transactional SMS messages',
        scope: 'transactional.sms:write'
      },
      {
        title: 'Events write',
        description: 'Track contact events',
        scope: 'events:write'
      },
      {
        title: 'Webhooks read',
        description: 'List webhook subscriptions',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks write',
        description: 'Create, update, and delete webhook subscriptions',
        scope: 'webhooks:write'
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
        url: `https://oauth.brevo.com/realms/partner/oauth/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      try {
        let response = await oauthAxios.post(
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
            scope: data.scope,
            authType: 'oauth' as const
          }
        };
      } catch (error) {
        throw brevoApiError(error, 'exchange OAuth authorization code');
      }
    },
    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw brevoServiceError(
          'Brevo OAuth refresh token is missing. Reconnect the account.'
        );
      }

      try {
        let response = await oauthAxios.post(
          '/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken
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
            scope: data.scope ?? ctx.output.scope,
            authType: 'oauth' as const
          }
        };
      } catch (error) {
        throw brevoApiError(error, 'refresh OAuth token');
      }
    },
    getProfile: async (ctx: any) => {
      try {
        let response = await apiAxios.get('/account', {
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
      } catch (error) {
        throw brevoApiError(error, 'get profile');
      }
    }
  });
