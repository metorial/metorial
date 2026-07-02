import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Roboflow Private API Key. Found under Settings > API Keys in your Roboflow dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.roboflow.com'
      });

      let response = await axios.get('/', {
        params: { api_key: ctx.output.token }
      });

      let data = response.data;

      return {
        profile: {
          id: data.workspace,
          name: data.workspace
        }
      };
    }
  });
