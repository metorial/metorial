import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { digitalOceanApiError, digitalOceanValidationError } from './lib/errors';

let buildExpiresAt = (expiresIn: unknown) =>
  typeof expiresIn === 'number'
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

let oauthOutputFromGrant = (data: any) => {
  if (!data?.access_token) {
    throw digitalOceanValidationError(
      'DigitalOcean OAuth response did not include an access token.'
    );
  }

  return {
    token: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: buildExpiresAt(data.expires_in)
  };
};

let getProfileFromToken = async (token: string) => {
  let axios = createAxios({
    baseURL: 'https://api.digitalocean.com/v2',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  try {
    let response = await axios.get('/account');
    let account = response.data.account;

    return {
      profile: {
        id: account.uuid,
        email: account.email,
        name: account.name || account.email,
        team: account.team?.name
      }
    };
  } catch (error) {
    throw digitalOceanApiError(error, 'get account profile');
  }
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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.digitalocean.com/reference/api/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.digitalocean.com/reference/api/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Read',
        description: 'Read access to your DigitalOcean resources',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Write access to your DigitalOcean resources',
        scope: 'write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://cloud.digitalocean.com/v1/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      try {
        let response = await axios.post(
          'https://cloud.digitalocean.com/v1/oauth/token',
          null,
          {
            params: {
              grant_type: 'authorization_code',
              code: ctx.code,
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              redirect_uri: ctx.redirectUri
            }
          }
        );

        return {
          output: oauthOutputFromGrant(response.data)
        };
      } catch (error) {
        throw digitalOceanApiError(error, 'exchange OAuth code');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw digitalOceanValidationError(
          'DigitalOcean OAuth refresh requires a refresh token.'
        );
      }

      let axios = createAxios();

      try {
        let response = await axios.post(
          'https://cloud.digitalocean.com/v1/oauth/refresh',
          null,
          {
            params: {
              grant_type: 'refresh_token',
              refresh_token: ctx.output.refreshToken
            }
          }
        );

        return {
          output: oauthOutputFromGrant(response.data)
        };
      } catch (error) {
        throw digitalOceanApiError(error, 'refresh OAuth token');
      }
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => getProfileFromToken(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { token: string };
    }) => getProfileFromToken(ctx.output.token)
  });
