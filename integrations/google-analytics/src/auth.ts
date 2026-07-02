import { SlateAuth } from 'slates';
import { z } from 'zod';
import { googleAnalyticsOAuthError, googleAnalyticsServiceError } from './lib/errors';
import { googleAnalyticsScopes } from './scopes';

type GoogleOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type GoogleUserInfoResponse = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
};

type GoogleOAuthRefreshContext = {
  output: {
    token: string;
    refreshToken?: string;
    measurementId?: string;
    apiSecret?: string;
  };
  input: Record<string, unknown>;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let readJsonResponse = async (response: Response) => {
  let text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

let googleFetch = async <T>(operation: string, url: string, init: RequestInit): Promise<T> => {
  try {
    let response = await fetch(url, init);
    let data = await readJsonResponse(response);

    if (!response.ok) {
      throw googleAnalyticsOAuthError(operation, {
        response: {
          status: response.status,
          statusText: response.statusText,
          data
        }
      });
    }

    return data as T;
  } catch (error) {
    throw googleAnalyticsOAuthError(operation, error);
  }
};

let measurementProtocolAuth = {
  type: 'auth.custom' as const,
  name: 'Measurement Protocol Only',
  key: 'measurement_protocol',

  inputSchema: z.object({
    measurementId: z.string().describe('Measurement ID for web streams (e.g., "G-XXXXXXX").'),
    apiSecret: z
      .string()
      .describe(
        'API secret for the Measurement Protocol. Generated in GA4 Admin > Data Streams.'
      )
  }),

  getOutput: async (ctx: {
    input: {
      measurementId: string;
      apiSecret: string;
    };
  }) => {
    return {
      output: {
        token: '',
        measurementId: ctx.input.measurementId,
        apiSecret: ctx.input.apiSecret
      }
    };
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('OAuth 2.0 access token for Data API and Admin API requests.'),
      refreshToken: z
        .string()
        .optional()
        .describe('OAuth 2.0 refresh token for long-lived access.'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the access token expires.'),
      measurementId: z
        .string()
        .optional()
        .describe(
          'Measurement ID for web streams (e.g., "G-XXXXXXX"). Populated by Measurement Protocol Only auth or legacy OAuth profiles.'
        ),
      apiSecret: z
        .string()
        .optional()
        .describe(
          'API secret for Measurement Protocol. Populated by Measurement Protocol Only auth or legacy OAuth profiles.'
        )
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
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Analytics Read-Only',
        description: 'Read-only access to Google Analytics data and configuration.',
        scope: googleAnalyticsScopes.analyticsReadonly
      },
      {
        title: 'Analytics Edit',
        description:
          'Edit access to Google Analytics configuration (also grants read access).',
        scope: googleAnalyticsScopes.analyticsEdit
      },
      {
        title: 'Manage Users',
        description: 'Manage user permissions on Analytics accounts and properties.',
        scope: googleAnalyticsScopes.analyticsManageUsers
      },
      {
        title: 'View User Permissions',
        description: 'View user permissions on Analytics accounts and properties.',
        scope: googleAnalyticsScopes.analyticsManageUsersReadonly
      },
      {
        title: 'User Profile',
        description: 'View basic profile information including email.',
        scope: googleAnalyticsScopes.openIdEmailProfile
      }
    ],

    inputSchema: z.object({}),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let data = await googleFetch<GoogleOAuthTokenResponse>(
        'callback',
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          body: new URLSearchParams({
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        input: ctx.input,
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: GoogleOAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw googleAnalyticsServiceError(
          'No refresh token available. Please re-authenticate.'
        );
      }

      let data = await googleFetch<GoogleOAuthTokenResponse>(
        'refresh',
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          body: new URLSearchParams({
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'refresh_token'
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt,
          measurementId: ctx.output.measurementId,
          apiSecret: ctx.output.apiSecret
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: Record<string, unknown>;
      scopes: string[];
    }) => {
      let data = await googleFetch<GoogleUserInfoResponse>(
        'profile lookup',
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        }
      );

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  })
  .addCustomAuth(measurementProtocolAuth);
