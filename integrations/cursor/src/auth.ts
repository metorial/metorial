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
        .describe(
          'Cursor API key (User API Key or Admin API Key). Generated from your Cursor dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let basicAuth = Buffer.from(`${ctx.output.token}:`).toString('base64');
      let client = createAxios({
        baseURL: 'https://api.cursor.com'
      });

      try {
        let response = await client.get('/v0/me', {
          headers: {
            Authorization: `Basic ${basicAuth}`
          }
        });

        return {
          profile: {
            email: response.data.userEmail,
            name: response.data.apiKeyName
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
