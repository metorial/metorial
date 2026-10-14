import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { MapboxClient } from './lib/client';

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
      let client = new MapboxClient({ token: ctx.output.token, username: '' });
      let tokenData = await client.validateToken();
      if (tokenData.code !== 'TokenValid' || !tokenData.token?.user) {
        throw createApiServiceError(
          `Mapbox access token is not valid (${tokenData.code || 'unknown status'}). Provide an active token.`,
          { upstreamCode: tokenData.code }
        );
      }
      return {
        profile: {
          id: tokenData.token.user,
          name: tokenData.token.user
        }
      };
    }
  });
