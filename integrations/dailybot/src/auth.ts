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
        .describe('DailyBot API Key generated from Organization Settings > Integrations')
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
        baseURL: 'https://api.dailybot.com/v1',
        headers: {
          'X-API-KEY': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await axios.get('/me/');
      let data = response.data;

      return {
        profile: {
          id: data.uuid,
          name: data.full_name,
          email: data.email
        }
      };
    }
  });
