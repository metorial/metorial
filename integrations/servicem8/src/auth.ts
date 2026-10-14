import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
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
        url: 'https://developer.servicem8.com/docs/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.servicem8.com/docs/authentication'
      }
    ],

    scopes: [
      {
        title: 'Create Jobs',
        description:
          'Create jobs on behalf of the account; creating jobs may incur account charges',
        scope: 'create_jobs'
      },
      {
        title: 'Manage Jobs',
        description: 'Read, update and delete jobs',
        scope: 'manage_jobs'
      },
      {
        title: 'Manage Customers',
        description: 'Read, create and update clients',
        scope: 'manage_customers'
      },
      {
        title: 'Manage Customer Contacts',
        description: 'Read, create and update client contacts',
        scope: 'manage_customer_contacts'
      },
      {
        title: 'Read Staff',
        description: 'Discover staff for scheduling',
        scope: 'read_staff'
      },
      {
        title: 'Manage Schedule',
        description: 'Read and create scheduled bookings and staff allocations',
        scope: 'manage_schedule'
      },
      {
        title: 'Manage Job Materials',
        description: 'Read and manage job line items',
        scope: 'manage_job_materials'
      },
      {
        title: 'Manage Job Payments',
        description: 'Record job payments',
        scope: 'manage_job_payments'
      },
      {
        title: 'Publish Job Notes',
        description: 'Add notes to jobs',
        scope: 'publish_job_notes'
      },
      {
        title: 'Read Inventory',
        description: 'Discover materials in the catalog',
        scope: 'read_inventory'
      },
      {
        title: 'Account Information',
        description: 'Read the connected account identity',
        scope: 'vendor'
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
        url: `https://go.servicem8.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAuthenticatedAxios({
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'ServiceM8',
            reason: 'servicem8_oauth_error'
          }),
        baseURL: 'https://go.servicem8.com'
      });

      let response = await http.post(
        '/oauth/access_token',
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'ServiceM8',
          required: true
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Reconnect ServiceM8 to obtain an OAuth refresh token.');
      }
      let http = createAuthenticatedAxios({
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'ServiceM8',
            reason: 'servicem8_oauth_error'
          }),
        baseURL: 'https://go.servicem8.com'
      });

      let response = await http.post(
        '/oauth/access_token',
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'ServiceM8',
          required: true,
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your ServiceM8 API key from Settings > API Keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiKey: ctx.input.apiKey
        }
      };
    }
  });
