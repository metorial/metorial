import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { neonApiError } from './lib/errors';

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
      token: z.string()
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
        baseURL: 'https://console.neon.tech/api/v2'
      });

      let response: any;

      try {
        response = await axios.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw neonApiError(error, 'profile lookup');
      }

      return {
        profile: {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          imageUrl: response.data.image
        }
      };
    }
  });
