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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Web Scraper Cloud API token. Find it at https://cloud.webscraper.io/api'
        )
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
        baseURL: 'https://api.webscraper.io/api/v1'
      });

      let response = await axios.get('/account', {
        params: { api_token: ctx.output.token }
      });

      let data = response.data.data;

      return {
        profile: {
          email: data.email,
          name: [data.firstname, data.lastname].filter(Boolean).join(' ')
        }
      };
    }
  });
