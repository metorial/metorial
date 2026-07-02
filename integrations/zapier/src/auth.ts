import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { zapierApiError, zapierServiceError } from './lib/errors';

let http = createAxios({
  baseURL: 'https://zapier.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
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
        url: 'https://docs.zapier.com/powered-by-zapier/authentication/methods/user-access-token'
      }
    ],

    scopes: [
      {
        title: 'Zaps (Read)',
        description: 'Read access to Zaps and apps',
        scope: 'zap'
      },
      {
        title: 'Zaps (All Owned)',
        description: 'Read access to all owned Zaps across the account',
        scope: 'zap:all'
      },
      {
        title: 'Zaps (All Account)',
        description: 'Read access to owned and shared Zaps across the account',
        scope: 'zap:account:all'
      },
      {
        title: 'Zaps (Write)',
        description: 'Create and modify Zaps and workflow steps',
        scope: 'zap:write'
      },
      {
        title: 'Connections (Read)',
        description: 'Read access to Zapier app authentications',
        scope: 'connection:read'
      },
      {
        title: 'Connections (Write)',
        description: 'Create new Zapier app authentications',
        scope: 'connection:write'
      },
      {
        title: 'Zap Runs',
        description: 'Read access to Zap run history',
        scope: 'zap:runs'
      },
      {
        title: 'Action Runs',
        description: 'Run actions and retrieve action run results',
        scope: 'action:run'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        response_mode: 'query',
        state: ctx.state
      });

      return {
        url: `https://api.zapier.com/v2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

        let response = await http.post(
          '/oauth/token/',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
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
            clientId: ctx.clientId,
            refreshToken: data.refresh_token,
            expiresAt
          }
        };
      } catch (error) {
        throw zapierApiError(error, 'OAuth token exchange');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw zapierServiceError('No Zapier refresh token is available.');
      }

      try {
        let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

        let response = await http.post(
          '/oauth/token/',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
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
            clientId: ctx.output.clientId ?? ctx.clientId,
            refreshToken: data.refresh_token ?? ctx.output.refreshToken,
            expiresAt
          }
        };
      } catch (error) {
        throw zapierApiError(error, 'OAuth token refresh');
      }
    }
  });
