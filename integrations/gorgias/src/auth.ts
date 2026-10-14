import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { createClient, getSubdomain } from './lib/helpers';

type GorgiasProfileContext = {
  input: { subdomain: string };
  output: {
    token: string;
    subdomain?: string;
    refreshToken?: string;
    expiresAt?: string;
    authType?: 'basic' | 'bearer';
  };
};

type GorgiasRefreshContext = GorgiasProfileContext & {
  clientId: string;
  clientSecret: string;
};

let GORGIAS_ACCESS_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

let normalizeGorgiasTokenResponse = (data: unknown, previousRefreshToken?: string) => {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    let payload = data as Record<string, unknown>;
    let expiresIn = payload.expires_in;
    // Gorgias documents zero lifetimes alongside its 24-hour access-token lifetime.
    let useDefaultLifetime =
      expiresIn === 0 ||
      expiresIn === '0' ||
      expiresIn === undefined ||
      expiresIn === null ||
      expiresIn === '';
    data = {
      ...payload,
      expires_in: useDefaultLifetime ? GORGIAS_ACCESS_TOKEN_LIFETIME_SECONDS : expiresIn
    };
  }
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Gorgias',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['bearer', 'basic']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth2',

    scopes: [
      { title: 'OpenID', description: 'OpenID Connect identity', scope: 'openid' },
      { title: 'Email', description: 'Access to email address', scope: 'email' },
      { title: 'Profile', description: 'Access to user profile', scope: 'profile' },
      {
        title: 'Offline Access',
        description: 'Refresh token for persistent access',
        scope: 'offline'
      },
      {
        title: 'Account Read',
        description: 'Read account info and settings',
        scope: 'account:read'
      },
      {
        title: 'Account Write',
        description: 'Write account info and settings',
        scope: 'account:write'
      },
      {
        title: 'Users Read',
        description: 'Read helpdesk users, roles, and teams',
        scope: 'users:read'
      },
      {
        title: 'Users Write',
        description: 'Write helpdesk users, roles, and teams',
        scope: 'users:write'
      },
      { title: 'Customers Read', description: 'Read customer data', scope: 'customers:read' },
      {
        title: 'Customers Write',
        description: 'Write customer data',
        scope: 'customers:write'
      },
      {
        title: 'Tickets Read',
        description: 'Read tickets, messages, tags, and views',
        scope: 'tickets:read'
      },
      {
        title: 'Tickets Write',
        description: 'Write tickets, messages, tags, and views',
        scope: 'tickets:write'
      },
      {
        title: 'Custom Fields Read',
        description: 'Read custom field definitions and values',
        scope: 'custom_fields:read'
      },
      {
        title: 'Custom Fields Write',
        description: 'Write custom field definitions and values',
        scope: 'custom_fields:write'
      },
      {
        title: 'Events Read',
        description: 'Read tracked account change events',
        scope: 'events:read'
      },
      {
        title: 'Events Write',
        description: 'Write tracked account change events',
        scope: 'events:write'
      },
      {
        title: 'Integrations Read',
        description: 'Read HTTP and native integrations',
        scope: 'integrations:read'
      },
      {
        title: 'Integrations Write',
        description: 'Write HTTP and native integrations',
        scope: 'integrations:write'
      },
      { title: 'Jobs Read', description: 'Read bulk operations', scope: 'jobs:read' },
      { title: 'Jobs Write', description: 'Write bulk operations', scope: 'jobs:write' },
      { title: 'Macros Read', description: 'Read macro templates', scope: 'macros:read' },
      { title: 'Macros Write', description: 'Write macro templates', scope: 'macros:write' },
      { title: 'Rules Read', description: 'Read automation rules', scope: 'rules:read' },
      { title: 'Rules Write', description: 'Write automation rules', scope: 'rules:write' },
      {
        title: 'Satisfaction Survey Read',
        description: 'Read satisfaction surveys',
        scope: 'satisfaction_survey:read'
      },
      {
        title: 'Satisfaction Survey Write',
        description: 'Write satisfaction surveys',
        scope: 'satisfaction_survey:write'
      },
      {
        title: 'Statistics Read',
        description: 'Read support metrics',
        scope: 'statistics:read'
      },
      { title: 'Tags Read', description: 'Read ticket tags', scope: 'tags:read' },
      { title: 'Tags Write', description: 'Write ticket tags', scope: 'tags:write' },
      {
        title: 'Apps Read',
        description: 'Read third-party app management',
        scope: 'apps:read'
      },
      {
        title: 'Apps Write',
        description: 'Write third-party app management',
        scope: 'apps:write'
      }
    ],

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your Gorgias account subdomain (e.g., "mystore" for mystore.gorgias.com)')
    }),

    getAuthorizationUrl: async ctx => {
      let subdomain = getSubdomain(undefined, ctx.input.subdomain);
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://${subdomain}.gorgias.com/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let subdomain = getSubdomain(undefined, ctx.input.subdomain);
      let http = createAuthenticatedAxios({
        baseURL: `https://${subdomain}.gorgias.com`,
        auth: { username: ctx.clientId, password: ctx.clientSecret },
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Gorgias',
            reason: 'gorgias_api_error',
            operation: 'exchange token'
          })
      });
      let response = await http.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      let token = normalizeGorgiasTokenResponse(response.data);

      return {
        output: { ...token, subdomain, authType: 'bearer' as const },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: GorgiasRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Reconnect Gorgias to obtain a refresh token.');
      }
      let subdomain = getSubdomain(undefined, ctx.output.subdomain || ctx.input.subdomain);
      let http = createAuthenticatedAxios({
        baseURL: `https://${subdomain}.gorgias.com`,
        auth: { username: ctx.clientId, password: ctx.clientSecret },
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Gorgias',
            reason: 'gorgias_api_error',
            operation: 'refresh token'
          })
      });
      let response = await http.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString()
      );
      let token = normalizeGorgiasTokenResponse(response.data, ctx.output.refreshToken);

      return {
        output: { ...token, subdomain, authType: 'bearer' as const },
        input: ctx.input
      };
    },

    getProfile: async (ctx: GorgiasProfileContext) => {
      let user = await createClient(
        {},
        {
          ...ctx.output,
          subdomain: ctx.output.subdomain || ctx.input.subdomain,
          authType: 'bearer'
        }
      ).getUser(0);
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name:
            user.name || [user.firstname, user.lastname].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Basic Auth)',
    key: 'api_key',

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your Gorgias account subdomain (e.g., "mystore" for mystore.gorgias.com)'),
      email: z.string().describe('Email address of the Gorgias user'),
      token: z.string().describe('API key from Settings → REST API')
    }),

    getOutput: async ctx => {
      let credentials = Buffer.from(`${ctx.input.email}:${ctx.input.token}`).toString(
        'base64'
      );
      return {
        output: {
          token: credentials,
          subdomain: getSubdomain(undefined, ctx.input.subdomain),
          authType: 'basic' as const
        }
      };
    },

    getProfile: async (ctx: GorgiasProfileContext) => {
      let user = await createClient(
        {},
        {
          ...ctx.output,
          subdomain: ctx.output.subdomain || ctx.input.subdomain,
          authType: 'basic'
        }
      ).getUser(0);
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name:
            user.name || [user.firstname, user.lastname].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
