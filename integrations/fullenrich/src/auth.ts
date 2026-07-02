import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiClient = createAxios({
  baseURL: 'https://app.fullenrich.com/api/v1'
});

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
        .describe('Your FullEnrich API key, found at https://app.fullenrich.com/app/api')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await apiClient.get('/account/keys/verify', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      return {
        profile: {
          id: response.data.workspace_id,
          name: `Workspace ${response.data.workspace_id}`
        }
      };
    }
  });
