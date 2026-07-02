import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Botpress Personal Access Token (PAT) or Bot Access Key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',
    inputSchema: z.object({
      token: z.string().describe('Personal Access Token from Botpress Profile Settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.botpress.cloud'
      });

      let response = await http.get('/v1/admin/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let account = response.data.account;
      return {
        profile: {
          id: account?.id,
          email: account?.email,
          name: account?.name
        }
      };
    }
  });
