import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('UniOne API key (user or project level)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('UniOne API key obtained from account settings or project settings')
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
        baseURL: 'https://api.unione.io/en/transactional/api/v1'
      });

      let response = await axios.post(
        '/system/info.json',
        {},
        {
          headers: {
            'X-API-KEY': ctx.output.token,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        profile: {
          id: String(data.user_id ?? ''),
          email: data.email ?? '',
          name: data.email ?? ''
        }
      };
    }
  });
