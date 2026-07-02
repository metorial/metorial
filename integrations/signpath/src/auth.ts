import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('SignPath API bearer token')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z.string().describe('API token generated from SignPath user profile settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let axios = createAxios({});
      try {
        let response = await axios.get(
          'https://app.signpath.io/API/v1-pre/InteractiveUsers/Me',
          {
            headers: {
              Authorization: `Bearer ${ctx.output.token}`
            }
          }
        );
        let user = response.data;
        return {
          profile: {
            id: user.id,
            name: user.name || user.displayName,
            email: user.email
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
