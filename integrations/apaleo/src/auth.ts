import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { apaleoApiError } from './lib/errors';

type AuthOutput = { token: string; refreshToken?: string; expiresAt?: string };

let identityAxios = createAuthenticatedAxios({
  baseURL: 'https://identity.apaleo.com',
  contentType: 'application/x-www-form-urlencoded',
  timeout: 30000,
  errorAdapter: apaleoApiError
});

let getClientCredentialsToken = async (input: { clientId: string; clientSecret: string }) => {
  let response = await identityAxios.post(
    '/connect/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    { auth: { username: input.clientId, password: input.clientSecret } }
  );
  return normalizeOAuthTokenResponse(response.data, { providerLabel: 'Apaleo' });
};

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
    name: 'OAuth (Connect Client)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://apaleo.dev/guides/oauth-connection/auth-code-grant.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://apaleo.dev/guides/api/scopes.html'
      }
    ],

    scopes: [
      { title: 'OpenID', description: 'OpenID Connect authentication', scope: 'openid' },
      { title: 'Profile', description: 'User profile information', scope: 'profile' },
      {
        title: 'Offline Access',
        description: 'Renew access without signing in again',
        scope: 'offline_access'
      },
      {
        title: 'Reservations Manage',
        description: 'Read, create, and manage bookings and reservations, and search offers',
        scope: 'reservations.manage'
      },
      {
        title: 'Setup Read',
        description: 'Read rooms, room types, and rate plans',
        scope: 'setup.read'
      },
      {
        title: 'Corporate Rate Plans',
        description: 'Include corporate rate plans',
        scope: 'rateplans.read-corporate'
      },
      {
        title: 'Folios Manage',
        description: 'Read folios and post charges, payments, and refunds',
        scope: 'folios.manage'
      },
      {
        title: 'Invoices Read',
        description: 'Retrieve invoice details',
        scope: 'invoices.read'
      },
      {
        title: 'Invoices Manage',
        description: 'Create, cancel, and pay invoices',
        scope: 'invoices.manage'
      },
      {
        title: 'Companies Manage',
        description: 'Read and manage company profiles',
        scope: 'companies.manage'
      },
      {
        title: 'Night Audit',
        description: 'Run night audit operations',
        scope: 'operations.trigger-night-audit'
      },
      {
        title: 'Change Room State',
        description: 'Change room conditions',
        scope: 'operations.change-room-state'
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
        url: `https://identity.apaleo.com/connect/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await identityAxios.post(
        '/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, { providerLabel: 'Apaleo' })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token available. Re-authenticate with the offline_access scope.'
        );
      }

      let response = await identityAxios.post(
        '/connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Apaleo',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      let response = await identityAxios.get('/connect/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.sub,
          email: data.email,
          name:
            data.name ||
            [data.given_name, data.family_name].filter(Boolean).join(' ') ||
            undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials (Simple Client)',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID for the simple client'),
      clientSecret: z.string().describe('Client secret for the simple client')
    }),

    docs: [
      {
        type: 'docs.auth.custom',
        name: 'Client credentials documentation',
        url: 'https://apaleo.dev/guides/oauth-connection/simple-client.html'
      }
    ],
    getOutput: async ctx => ({ output: await getClientCredentialsToken(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: { clientId: string; clientSecret: string };
    }) => ({ output: await getClientCredentialsToken(ctx.input) })
  });
