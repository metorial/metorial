import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Bannerbear Project API Key or Master API Key. Found in Project > Settings.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.bannerbear.com/v2'
      });

      let response = await axios.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      return {
        profile: {
          id: response.data.uid,
          name: response.data.paid_plan_name || 'Bannerbear Account'
        }
      };
    }
  });
