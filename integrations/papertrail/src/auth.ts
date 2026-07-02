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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Papertrail API token found in your user profile settings')
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
        baseURL: 'https://papertrailapp.com/api/v1',
        headers: {
          'X-Papertrail-Token': ctx.output.token
        }
      });

      let response = await axios.get('/accounts.json');
      let account = response.data;

      return {
        profile: {
          id: String(account.id),
          name: account.name
        }
      };
    }
  });
