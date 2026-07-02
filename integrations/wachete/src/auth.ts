import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.wachete.com/thirdparty/v1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      userId: z.string().describe('Your Wachete User ID, found in your profile settings'),
      apiKey: z.string().describe('Your Wachete API Key, found in your profile settings')
    }),

    getOutput: async ctx => {
      let response = await http.post('/user/apilogin', {
        userId: ctx.input.userId,
        apiKey: ctx.input.apiKey
      });

      return {
        output: {
          token: response.data.token
        }
      };
    }
  });
