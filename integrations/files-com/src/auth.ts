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
          'Your Files.com API key. Can be a site-wide key or a user-specific key. Generate one from the Files.com web interface under API Keys.'
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
      let ax = createAxios({
        baseURL: 'https://app.files.com/api/rest/v1',
        headers: {
          'X-FilesAPI-Key': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await ax.get('/api_key.json');
      let apiKey = response.data;

      return {
        profile: {
          id: String(apiKey.user_id ?? apiKey.id),
          name: apiKey.name,
          email: apiKey.descriptive_label
        }
      };
    }
  });
