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
          'DatoCMS API token. Obtain from Project Settings > API Tokens in your DatoCMS dashboard.'
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
        baseURL: 'https://site-api.datocms.com'
      });

      let response = await axios.get('/site', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json',
          'X-Api-Version': '3'
        }
      });

      let site = response.data;
      return {
        profile: {
          id: site.id,
          name: site.name
        }
      };
    }
  });
