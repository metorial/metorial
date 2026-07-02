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
      token: z.string().describe('Mem0 API key from the Mem0 Dashboard (app.mem0.ai)')
    }),

    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://api.mem0.ai'
      });

      await axiosInstance.get('/v1/entities/', {
        headers: {
          Authorization: `Token ${ctx.output.token}`
        },
        params: {
          page: 1,
          page_size: 1
        }
      });

      return {
        profile: {
          id: 'mem0-user',
          name: 'Mem0 User'
        }
      };
    }
  });
