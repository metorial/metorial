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
      token: z.string().describe('Mistral AI API key from https://console.mistral.ai')
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
        baseURL: 'https://api.mistral.ai/v1'
      });

      await axios.get('/models', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      return {
        profile: {
          name: 'Mistral AI User'
        }
      };
    }
  });
