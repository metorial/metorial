import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.mapbox.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Mapbox access token (public pk.*, secret sk.*, or temporary tk.*). Secret tokens are required for write operations.'
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
      let response = await http.get('/tokens/v2', {
        params: { access_token: ctx.output.token }
      });
      let tokenData = response.data;
      return {
        profile: {
          id: tokenData.token?.substring(0, 20),
          name: tokenData.code === 'TokenValid' ? 'Valid Mapbox Token' : 'Mapbox Token'
        }
      };
    }
  });
