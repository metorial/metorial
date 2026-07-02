import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)'),
      clientId: z.string().describe('Your UserVoice API Key (Client ID)'),
      clientSecret: z.string().describe('Your UserVoice API Secret (Client Secret)')
    }),

    getOutput: async ctx => {
      let http = createAxios({
        baseURL: `https://${ctx.input.subdomain}.uservoice.com`
      });

      let response = await http.post('/api/v2/oauth/token', {
        grant_type: 'client_credentials',
        client_id: ctx.input.clientId,
        client_secret: ctx.input.clientSecret
      });

      return {
        output: {
          token: response.data.access_token,
          subdomain: ctx.input.subdomain
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; subdomain: string }; input: any }) => {
      let http = createAxios({
        baseURL: `https://${ctx.output.subdomain}.uservoice.com`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/api/v2/admin/users/current');
      let user = response.data?.users?.[0];

      return {
        profile: {
          id: user?.id ? String(user.id) : undefined,
          name: user?.name,
          email: user?.email_address,
          imageUrl: user?.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)'),
      token: z.string().describe('Your UserVoice API bearer token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          subdomain: ctx.input.subdomain
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; subdomain: string }; input: any }) => {
      let http = createAxios({
        baseURL: `https://${ctx.output.subdomain}.uservoice.com`,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/api/v2/admin/users/current');
      let user = response.data?.users?.[0];

      return {
        profile: {
          id: user?.id ? String(user.id) : undefined,
          name: user?.name,
          email: user?.email_address,
          imageUrl: user?.avatar_url
        }
      };
    }
  });
