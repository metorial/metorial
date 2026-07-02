import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key Credentials',
    key: 'api_key',

    inputSchema: z.object({
      clientId: z.string().describe('Looker API3 Client ID'),
      clientSecret: z.string().describe('Looker API3 Client Secret'),
      instanceUrl: z
        .string()
        .describe('Looker instance URL (e.g., https://mycompany.looker.com)')
    }),

    getOutput: async ctx => {
      let baseUrl = ctx.input.instanceUrl.replace(/\/+$/, '');

      let axiosInstance = createAxios({
        baseURL: `${baseUrl}/api/4.0`
      });

      let response = await axiosInstance.post('/login', null, {
        params: {
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret
        }
      });

      return {
        output: {
          token: response.data.access_token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axiosInstance = createAxios();

      let response = await axiosInstance.get(`/api/4.0/user`, {
        headers: {
          Authorization: `token ${ctx.output.token}`
        },
        baseURL: ctx.input.instanceUrl.replace(/\/+$/, '')
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
        }
      };
    }
  });
