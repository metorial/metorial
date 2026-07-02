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
        .describe('Your Unisender API key. Found under API section of your account settings.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let ax = createAxios({
        baseURL: 'https://api.unisender.com/en/api'
      });

      let response = await ax.get('/getUserInfo', {
        params: {
          api_key: ctx.output.token,
          format: 'json'
        }
      });

      let result = response.data?.result;

      return {
        profile: {
          id: result?.login,
          email: result?.email,
          name: result?.login
        }
      };
    }
  });
