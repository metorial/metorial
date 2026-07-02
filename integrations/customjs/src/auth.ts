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
        .describe(
          'Your CustomJS API key. Found on the right-hand side of your dashboard at https://app.customjs.io'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.app.customjs.io'
      });

      let response = await client.get(`/core/api-key/${ctx.output.token}`, {
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.workspaceId || data.id,
          name: data.workspaceName || data.name,
          email: data.email
        }
      };
    }
  });
