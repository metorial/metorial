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
        .describe('Your eSputnik/Yespo API key. Generate one in your account Settings → API.')
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
        baseURL: 'https://api.yespo.io/api'
      });

      let basicToken = Buffer.from(`x:${ctx.output.token}`).toString('base64');

      let response = await axios.get('/v1/account/info', {
        headers: {
          Authorization: `Basic ${basicToken}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      });

      return {
        profile: {
          name: response.data?.organisationName || response.data?.name,
          id: response.data?.id?.toString()
        }
      };
    }
  });
