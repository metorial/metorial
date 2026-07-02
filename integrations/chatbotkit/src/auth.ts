import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.chatbotkit.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Secret Key',
    key: 'api_secret_key',
    inputSchema: z.object({
      apiSecretKey: z.string().describe('ChatBotKit API secret key (starts with sk-)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiSecretKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { apiSecretKey: string };
    }) => {
      let _response = await axios.get('/v1/partner/list', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        },
        params: { cursor: '0', take: 1 },
        validateStatus: () => true
      });

      return {
        profile: {
          name: 'ChatBotKit Account'
        }
      };
    }
  });
