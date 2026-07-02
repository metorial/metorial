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
          'Your Formbricks Management API key. Generate one in Settings > API Keys in the Formbricks app.'
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
      let http = createAxios({
        baseURL: 'https://app.formbricks.com'
      });

      let response = await http.get('/api/v1/management/me', {
        headers: {
          'x-api-key': ctx.output.token
        }
      });

      let data = response.data?.data;

      return {
        profile: {
          id: data?.project?.id,
          name: data?.project?.name,
          environment: data?.environment?.type
        }
      };
    }
  });
