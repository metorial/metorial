import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('ProcFu API Auth Token found on your Account Settings page')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let { createAxios } = await import('slates');
      let client = createAxios({
        baseURL: 'https://procfu.com'
      });

      let response = await client.post('/exe/whoami.pf', '', {
        headers: {
          Authorization: `Basic ${ctx.output.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let email =
        typeof response.data === 'string' ? response.data.trim() : String(response.data);

      return {
        profile: {
          email,
          name: email
        }
      };
    }
  });
