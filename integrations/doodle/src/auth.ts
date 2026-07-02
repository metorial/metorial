import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://doodle.com'
});

type DoodleOAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

type DoodleAuthorizationContext = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
};

type DoodleCallbackContext = DoodleAuthorizationContext & {
  clientSecret: string;
  code: string;
};

type DoodleTokenRefreshContext = {
  clientId: string;
  clientSecret: string;
  output: DoodleOAuthOutput;
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

    scopes: [
      {
        title: 'Name',
        description: 'Access to your name',
        scope: 'name'
      },
      {
        title: 'Email Address',
        description: 'Access to your email address',
        scope: 'eMailAddress'
      },
      {
        title: 'Initiated Polls',
        description: 'Access to polls you have created',
        scope: 'initiatedPolls'
      },
      {
        title: 'Participated Polls',
        description: 'Access to polls you have participated in',
        scope: 'participatedPolls'
      }
    ],

    getAuthorizationUrl: async (ctx: DoodleAuthorizationContext) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://doodle.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: DoodleCallbackContext) => {
      let response = await http.post(
        '/oauth2/token',
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

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: DoodleTokenRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await http.post(
        '/oauth2/token',
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
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await http.get('/api/v2.0/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.emailAddress,
          name: user.name
        }
      };
    }
  });
