import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { herokuApiError, herokuServiceError } from './lib/errors';

let herokuApi = createAxios({
  baseURL: 'https://api.heroku.com'
});

let herokuIdentity = createAxios({
  baseURL: 'https://id.heroku.com'
});

for (let axios of [herokuApi, herokuIdentity]) {
  axios.interceptors.response.use(
    (response: any) => response,
    (error: unknown) => Promise.reject(herokuApiError(error))
  );
}

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

    scopes: [
      {
        title: 'Global',
        description:
          'Read and write access to all account, app, and resource APIs used by this integration.',
        scope: 'global'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://id.heroku.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await herokuIdentity.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      if (!data.access_token) {
        throw herokuServiceError(
          'Heroku OAuth token response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let response = await herokuIdentity.post(
        '/oauth/token',
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

      let data = response.data;
      if (!data.access_token) {
        throw herokuServiceError(
          'Heroku OAuth refresh response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await herokuApi.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.heroku+json; version=3'
        }
      });

      let account = response.data;
      if (!account.id || !account.email) {
        throw herokuServiceError('Heroku profile response did not include account details.');
      }

      return {
        profile: {
          id: account.id,
          email: account.email,
          name: account.name || account.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Heroku API token or authorization key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await herokuApi.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.heroku+json; version=3'
        }
      });

      let account = response.data;
      if (!account.id || !account.email) {
        throw herokuServiceError('Heroku profile response did not include account details.');
      }

      return {
        profile: {
          id: account.id,
          email: account.email,
          name: account.name || account.email
        }
      };
    }
  });
