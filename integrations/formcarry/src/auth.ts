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
      apiKey: z
        .string()
        .describe(
          'Your Formcarry team API key, found under the Integrations section of the dashboard.'
        )
    }),

    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: 'https://formcarry.com/api',
        headers: {
          api_key: ctx.input.apiKey
        }
      });

      let response = await axios.get('/auth');

      if (response.data?.status !== 'success') {
        throw new Error('Authentication failed. Please check your API key.');
      }

      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
