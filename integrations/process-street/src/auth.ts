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
        .describe('Process Street API key from the Integrations tab in organization settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://public-api.process.st/api/v1.1',
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let response = await axios.get('/testAuth');
      return {
        profile: {
          name: response.data.apiKeyLabel
        }
      };
    }
  });
