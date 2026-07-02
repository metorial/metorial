import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { calendlyApiError, calendlyServiceError } from './lib/errors';

let calendlyOauthScopes = [
  'users:read',
  'organizations:read',
  'event_types:read',
  'availability:read',
  'scheduled_events:read',
  'scheduled_events:write',
  'scheduling_links:write',
  'routing_forms:read',
  'webhooks:write'
];

let authAxios = createAxios({
  baseURL: 'https://auth.calendly.com'
});

let apiAxios = createAxios({
  baseURL: 'https://api.calendly.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      userUri: z.string().optional(),
      organizationUri: z.string().optional()
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
        url: 'https://developer.calendly.com/api-docs/3cefb59b832eb-calendly-o-auth-2-0'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.calendly.com/api-docs/3cefb59b832eb-calendly-o-auth-2-0'
      }
    ],

    scopes: [
      ...calendlyOauthScopes.map(scope => ({
        title: scope,
        description: `Calendly ${scope} scope`,
        scope
      }))
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: calendlyOauthScopes.join(' ')
      });

      return {
        url: `https://auth.calendly.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let response = await authAxios.post('/oauth/token', {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        });

        let tokenData = response.data;
        let expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        let userResponse = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        });

        let user = userResponse.data.resource;

        return {
          output: {
            token: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt,
            userUri: user.uri,
            organizationUri: user.current_organization
          }
        };
      } catch (error) {
        throw calendlyApiError(error, 'OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw calendlyServiceError('Calendly OAuth refresh token is missing');
      }

      try {
        let response = await authAxios.post('/oauth/token', {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        });

        let tokenData = response.data;
        let expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        return {
          output: {
            ...ctx.output,
            token: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? ctx.output.refreshToken,
            expiresAt
          }
        };
      } catch (error) {
        throw calendlyApiError(error, 'OAuth token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      try {
        let response = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let user = response.data.resource;

        return {
          profile: {
            id: user.uri,
            email: user.email,
            name: user.name,
            imageUrl: user.avatar_url,
            schedulingUrl: user.scheduling_url,
            timezone: user.timezone
          }
        };
      } catch (error) {
        throw calendlyApiError(error, 'get OAuth profile');
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal access token from Calendly Integrations page (API & Webhooks)')
    }),

    getOutput: async ctx => {
      try {
        let response = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.input.token}`
          }
        });

        let user = response.data.resource;

        return {
          output: {
            token: ctx.input.token,
            userUri: user.uri,
            organizationUri: user.current_organization
          }
        };
      } catch (error) {
        throw calendlyApiError(error, 'validate personal access token');
      }
    },

    getProfile: async (ctx: any) => {
      try {
        let response = await apiAxios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });

        let user = response.data.resource;

        return {
          profile: {
            id: user.uri,
            email: user.email,
            name: user.name,
            imageUrl: user.avatar_url,
            schedulingUrl: user.scheduling_url,
            timezone: user.timezone
          }
        };
      } catch (error) {
        throw calendlyApiError(error, 'get personal access token profile');
      }
    }
  });
