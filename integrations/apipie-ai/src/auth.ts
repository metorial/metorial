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
        .describe(
          'Your APIpie AI API key. Obtain one from https://apipie.ai/dashboard/profile/api-keys'
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
        baseURL: 'https://apipie.ai/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      await axios.get('/models', { params: { type: 'llm' } });

      return {
        profile: {
          id: 'apipie-user',
          name: 'APIpie AI User'
        }
      };
    }
  });
