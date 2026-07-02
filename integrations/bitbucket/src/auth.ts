import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { bitbucketApiError, bitbucketServiceError } from './lib/errors';

let api = createAxios({
  baseURL: 'https://api.bitbucket.org/2.0'
});

api.interceptors?.response.use(
  response => response,
  error => Promise.reject(bitbucketApiError(error))
);

let normalizeCredential = (value: string) => value.trim();

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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.atlassian.com/bitbucket-cloud/docs/oauth-endpoints/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://support.atlassian.com/bitbucket-cloud/docs/oauth-endpoints/#bitbucket-oauth-2-0-scopes'
      }
    ],
    scopes: [],

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: normalizeCredential(ctx.clientId),
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.redirectUri) {
        params.set('redirect_uri', ctx.redirectUri);
      }

      return {
        url: `https://bitbucket.org/site/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: any) => {
      let clientId = normalizeCredential(ctx.clientId);
      let clientSecret = normalizeCredential(ctx.clientSecret);
      let credentials = btoa(`${clientId}:${clientSecret}`);

      let response = await api.post(
        'https://bitbucket.org/site/oauth2/access_token',
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
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
        throw bitbucketServiceError('No refresh token available');
      }

      let clientId = normalizeCredential(ctx.clientId);
      let clientSecret = normalizeCredential(ctx.clientSecret);
      let credentials = btoa(`${clientId}:${clientSecret}`);

      let response = await api.post(
        'https://bitbucket.org/site/oauth2/access_token',
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
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.uuid,
          name: user.display_name,
          imageUrl: user.links?.avatar?.href
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      email: z
        .string()
        .describe(
          'Basic-auth username: your **Atlassian account email** (Bitbucket → Personal settings → Email aliases) when using an **API token**; your **Bitbucket username** (same settings page) when using an **app password** (deprecated until June 2026).'
        ),
      token: z
        .string()
        .describe(
          'Basic-auth password: a **Bitbucket** API token from id.atlassian.com → Security → Create API token **with scopes** → app **Bitbucket** (e.g. grant **Repositories: Write** to create repos), or an app password with matching Bitbucket scopes.'
        )
    }),

    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.email}:${ctx.input.token}`);

      return {
        output: {
          // Full Authorization header value; Client passes this through (OAuth uses raw bearer token).
          token: `Basic ${credentials}`
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/user', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.uuid,
          name: user.display_name,
          email: user.username,
          imageUrl: user.links?.avatar?.href
        }
      };
    }
  });
