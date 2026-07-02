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
        .describe('Postman API key (generated from your Postman account settings)')
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
        baseURL: 'https://api.getpostman.com',
        headers: {
          'X-API-Key': ctx.output.token
        }
      });

      let response = await axios.get('/me');
      let user = response.data.user;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.fullName,
          imageUrl: user.avatar,
          username: user.username
        }
      };
    }
  });
