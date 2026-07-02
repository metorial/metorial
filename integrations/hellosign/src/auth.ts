import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { hellosignApiError } from './lib/errors';

let api = createAxios({
  baseURL: 'https://api.hellosign.com/v3'
});

api.interceptors.response.use(
  response => response,
  error => Promise.reject(hellosignApiError(error, 'auth request'))
);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z.enum(['oauth', 'api_key'])
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.hellosign.com/docs/oauth/overview/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.hellosign.com/docs/oauth/overview/'
      }
    ],

    scopes: [
      {
        title: 'Basic Account Info',
        description: 'Access basic account information (email, name). App owner is billed.',
        scope: 'basic_account_info'
      },
      {
        title: 'Request Signature',
        description:
          'Send signature requests, access statuses and document files. App owner is billed.',
        scope: 'request_signature'
      },
      {
        title: 'Account Access',
        description: 'Access basic account information. User is billed.',
        scope: 'account_access'
      },
      {
        title: 'Signature Request Access',
        description:
          'Send, view, update signature requests and download files. User is billed.',
        scope: 'signature_request_access'
      },
      {
        title: 'Template Access',
        description: 'View, create, and modify templates. User is billed.',
        scope: 'template_access'
      },
      {
        title: 'Team Access',
        description: 'View and modify team settings and members. User is billed.',
        scope: 'team_access'
      },
      {
        title: 'API App Access',
        description: 'View, create, and modify embedded API apps. User is billed.',
        scope: 'api_app_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        state: ctx.state,
        redirect_uri: ctx.redirectUri
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://app.hellosign.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await api.post('/oauth/token', {
        state: ctx.state,
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'authorization_code'
      });

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Dropbox Sign',
        operation: 'token exchange',
        accessTokenMessage: 'Dropbox Sign OAuth token exchange did not return an access token.'
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

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('No Dropbox Sign refresh token is available.');
      }

      let response = await api.post(
        '/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          params: { refresh: true }
        }
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Dropbox Sign',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy',
        accessTokenMessage: 'Dropbox Sign OAuth refresh did not return an access token.'
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

    getProfile: async (ctx: {
      output: {
        token: string;
        authMethod: 'oauth' | 'api_key';
        refreshToken?: string;
        expiresAt?: string;
      };
      input: {};
      scopes: string[];
    }) => {
      let response = await api.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let account = response.data.account;

      return {
        profile: {
          id: account.account_id,
          email: account.email_address
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authMethod: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        authMethod: 'oauth' | 'api_key';
        refreshToken?: string;
        expiresAt?: string;
      };
      input: { apiKey: string };
    }) => {
      let encoded = btoa(`${ctx.output.token}:`);
      let response = await api.get('/account', {
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let account = response.data.account;

      return {
        profile: {
          id: account.account_id,
          email: account.email_address
        }
      };
    }
  });
