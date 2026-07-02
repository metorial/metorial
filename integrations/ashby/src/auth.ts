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
      token: z.string().describe('Ashby API key from Developer Settings')
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
        baseURL: 'https://api.ashbyhq.com',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${ctx.output.token}:`)}`
        }
      });

      let response = await axios.post('/apiKey.info', {});

      return {
        profile: {
          name: response.data.results.title
        }
      };
    }
  });
