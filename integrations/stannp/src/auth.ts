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
        .describe('Your Stannp API key, found at the bottom of your account settings page')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api-us1.stannp.com/v1/',
        auth: {
          username: ctx.output.token,
          password: ''
        }
      });

      let response = await axios.get('/user/info');
      let data = response.data?.data;

      return {
        profile: {
          id: data?.id?.toString(),
          email: data?.email,
          name: data?.firstname ? `${data.firstname} ${data.lastname || ''}`.trim() : undefined
        }
      };
    }
  });
