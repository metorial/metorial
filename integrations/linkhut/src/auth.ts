import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
        title: 'Read Posts',
        description: 'Read access to bookmarks',
        scope: 'posts:read'
      },
      {
        title: 'Write Posts',
        description: 'Create, update, and delete bookmarks',
        scope: 'posts:write'
      },
      {
        title: 'Read Tags',
        description: 'Read access to tags',
        scope: 'tags:read'
      },
      {
        title: 'Write Tags',
        description: 'Delete and rename tags',
        scope: 'tags:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: scopeString,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://ln.ht/_/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://api.ln.ht/v1/oauth/token',
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
      let axios = createAxios();

      let response = await axios.post(
        'https://api.ln.ht/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken || ''
        }).toString(),
        {
          headers: {
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
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal access token from https://ln.ht/_/oauth/personal-token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
