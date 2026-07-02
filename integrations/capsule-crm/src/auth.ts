import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let capsuleAxios = createAxios({
  baseURL: 'https://api.capsulecrm.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      subdomain: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read',
        description: 'Read access to your Capsule CRM data',
        scope: 'read'
      },
      {
        title: 'Write',
        description: 'Write access to create, update, and delete Capsule CRM data',
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
        url: `https://api.capsulecrm.com/oauth/authorise?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await capsuleAxios.post(
        '/oauth/token',
        {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          subdomain: data.subdomain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await capsuleAxios.post(
        '/oauth/token',
        {
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          subdomain: data.subdomain ?? ctx.output.subdomain
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await capsuleAxios.get('/api/v2/users/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          email: user.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal Access Token generated from your Capsule CRM account preferences')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await capsuleAxios.get('/api/v2/users/current', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          name: user.name,
          email: user.username
        }
      };
    }
  });
