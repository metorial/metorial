import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Amara API key from your account settings page'),
      username: z.string().describe('Your Amara username')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; username: string } }) => {
      let client = createAxios({
        baseURL: 'https://amara.org/api'
      });

      let response = await client.get(`/users/${ctx.output.username}/`, {
        headers: {
          'X-api-key': ctx.output.token,
          'X-api-username': ctx.output.username,
          'Content-Type': 'application/json'
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.full_name || user.username,
          imageUrl: user.avatar
        }
      };
    }
  });
