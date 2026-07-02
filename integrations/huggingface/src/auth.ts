import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let hfAxios = createAxios({
  baseURL: 'https://huggingface.co'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'OpenID',
        description: 'OpenID Connect identity',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'User profile information',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'User email address',
        scope: 'email'
      },
      {
        title: 'Read Repos',
        description: 'Read access to repositories',
        scope: 'read-repos'
      },
      {
        title: 'Write Repos',
        description: 'Write access to repositories',
        scope: 'write-repos'
      },
      {
        title: 'Manage Repos',
        description: 'Manage repositories (create, delete, update settings)',
        scope: 'manage-repos'
      },
      {
        title: 'Inference API',
        description: 'Make inference requests on behalf of the user',
        scope: 'inference-api'
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
        url: `https://huggingface.co/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await hfAxios.post(
        '/oauth/token',
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

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      // Hugging Face OAuth tokens don't typically have refresh tokens
      // Return existing output
      return {
        output: ctx.output
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: any; scopes: string[] }) => {
      let response = await hfAxios.get('/api/whoami-v2', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.fullname || data.name,
          email: data.email,
          imageUrl: data.avatarUrl,
          username: data.name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Hugging Face User Access Token (starts with hf_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await hfAxios.get('/api/whoami-v2', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.fullname || data.name,
          email: data.email,
          imageUrl: data.avatarUrl,
          username: data.name
        }
      };
    }
  });
