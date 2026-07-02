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
          'Gigasheet API key. Generate one from the left menu on your Library page at app.gigasheet.com.'
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
      let client = createAxios({
        baseURL: 'https://api.gigasheet.com',
        headers: {
          'X-GIGASHEET-TOKEN': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await client.get('/user/whoami');
      let details = await client.get('/user/details');

      return {
        profile: {
          id: details.data?.Id ?? response.data?.username,
          email: details.data?.Email ?? response.data?.username,
          name: details.data?.Name ?? response.data?.username
        }
      };
    }
  });
