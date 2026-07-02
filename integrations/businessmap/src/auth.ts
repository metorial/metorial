import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Kanbanize API key. Find it under your user dropdown menu > API.'),
      subdomain: z
        .string()
        .describe(
          'Your Kanbanize account subdomain (e.g. "mycompany" from mycompany.kanbanize.com)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          subdomain: ctx.input.subdomain
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: `https://${ctx.output.subdomain}.kanbanize.com/api/v2`,
        headers: {
          apikey: ctx.output.token
        }
      });

      let response = await http.get('/me');
      let user = response.data?.data;

      return {
        profile: {
          id: String(user?.user_id ?? ''),
          email: user?.email ?? '',
          name: user?.username ?? ''
        }
      };
    }
  });
